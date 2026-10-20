/**
 * Edits of the golden test of byte preservation, shared by the fixtures and the corpus: the
 * commits made at each scalar field and at each collection, and the regions of the text that each
 * commit may change.
 */
import type { CommitService, FormReady } from "../../src/application";
import {
  isScalarKind,
  REFUSALS,
  type Commit,
  type Field,
  type ScalarField,
  type ScalarValue,
  type SequenceField,
} from "../../src/domain";
import { commentsOf } from "./yaml-comments";

/** Scalar fields of the tree under `field`, each with its parent. */
export function scalarSites(
  field: Field,
  parent: Field | null = null,
): [ScalarField, Field | null][] {
  const own: [ScalarField, Field | null][] = isScalarKind(field.kind)
    ? [[field as ScalarField, parent]]
    : [];
  const children = "children" in field ? field.children : "items" in field ? field.items : [];
  return [...own, ...children.flatMap((child) => scalarSites(child, field))];
}

/** Commits of one field: a value keeping its style, a value forcing another style, a clear. */
export function variants(field: ScalarField): [string, ScalarValue][] {
  switch (field.kind) {
    case "number":
      return [
        ["keeps the style", typeof field.value === "number" ? field.value + 1 : 7],
        ["changes the style", "open"],
        ["clears", null],
      ];
    case "boolean":
      return [
        ["keeps the style", field.value !== true],
        ["clears", null],
      ];
    case "choice": {
      const other = field.options.find((option) => option.value !== field.value);
      return [
        ["keeps the style", other === undefined ? field.value : other.value],
        ["clears", null],
      ];
    }
    case "markdown":
      return [
        ["keeps the style", "edited prose"],
        ["changes the style", "First paragraph.\n\nSecond paragraph, with: a colon.\n"],
        ["clears", null],
      ];
    case "latex":
      return [
        ["keeps the style", "edited"],
        ["changes the style", "\\frac{a}{b} # [c]"],
        ["clears", null],
      ];
    default:
      return [
        ["keeps the style", "edited"],
        ["changes the style", "a: b # c, [d]"],
        ["clears", null],
      ];
  }
}

/** Start of the line holding `offset`. */
const lineStart = (text: string, offset: number): number => text.lastIndexOf("\n", offset - 1) + 1;

/**
 * Region `[start, end)` of the old text that a commit at the present `field` may change: the
 * lines of its entry, up to the next key, which the removal of a first key of an item reaches.
 */
export function entryRegion(text: string, field: Field, parent: Field | null): [number, number] {
  const range = field.node?.range;
  if (!range) throw new Error(`No range at ${field.id}.`);
  const key = field.path.at(-1);
  const entry =
    parent?.node?.kind === "mapping" ? parent.node.entries.find((e) => e.key === key) : undefined;
  const start = lineStart(text, entry?.keyRange?.start ?? range.start);
  let end =
    range.end > range.start && text.charAt(range.end - 1) === "\n"
      ? range.end
      : text.indexOf("\n", range.end) + 1;
  if (end === 0) end = text.length;
  while (text.charAt(end) === " ") end += 1;
  return [start, end];
}

/**
 * Whether `after` equals `before` with only the region `[start, end)` replaced: every byte before
 * and after that region is identical. With `start === end`, `after` is an insertion into `before`.
 */
export function changesOnly(before: string, after: string, start: number, end: number): boolean {
  const head = before.slice(0, start);
  const tail = before.slice(end);
  return (
    after.length >= head.length + tail.length && after.startsWith(head) && after.endsWith(tail)
  );
}

/** Offset of the first byte where `before` and `after` differ, a candidate insertion point. */
export function firstDifference(before: string, after: string): number {
  let offset = 0;
  while (offset < before.length && before[offset] === after[offset]) offset += 1;
  return offset;
}

/** Whether `field` lies in a collection written between brackets or braces. */
export const inFlow = (parent: Field | null): boolean =>
  (parent?.node?.kind === "mapping" || parent?.node?.kind === "sequence") && parent.node.flow;

/** Collection fields of the tree under `field`, each with its parent. */
export function collectionSites(
  field: Field,
  parent: Field | null = null,
): [Field, Field | null][] {
  const own: [Field, Field | null][] = isScalarKind(field.kind) ? [] : [[field, parent]];
  const children = "children" in field ? field.children : "items" in field ? field.items : [];
  return [...own, ...children.flatMap((child) => collectionSites(child, field))];
}

/** First scalar field of the absent template `field`, itself included, with a value to write. */
function firstScalar(field: Field): [ScalarField, ScalarValue] | null {
  if (isScalarKind(field.kind)) {
    const scalar = field as ScalarField;
    const [, value] = variants(scalar)[0] ?? [];
    return value === undefined || value === null ? null : [scalar, value];
  }
  const children = "children" in field ? field.children : [];
  for (const child of children) {
    const found = firstScalar(child);
    if (found !== null) return found;
  }
  return null;
}

/** Absent sequences of `field` and of the mappings under it, down to the first present sequence. */
function absentSequences(field: Field): SequenceField[] {
  if ("items" in field) return field.node === null ? [field] : [];
  return "children" in field ? field.children.flatMap(absentSequences) : [];
}

/**
 * Commits opening a new collection in each member of `members`, the items or entries of a
 * collection and the template of its next one: the first scalar of each absent sequence. The
 * path of a scalar under the template of a keyed entry is moved by `place`.
 */
function newCollections(
  members: readonly Field[],
  place: (path: Commit["path"]) => Commit["path"] = (path) => path,
): [string, Commit, boolean][] {
  return members.flatMap(absentSequences).flatMap((sequence): [string, Commit, boolean][] => {
    const leaf = sequence.next === null ? null : firstScalar(sequence.next);
    if (leaf === null) return [];
    const [scalar, value] = leaf;
    return [[`${sequence.id} opened`, { path: place(scalar.path), value }, true]];
  });
}

/** Structural commits of one collection field, each labelled, with whether it inserts. */
export function structuralCommits(field: Field): [string, Commit, boolean][] {
  const commits: [string, Commit, boolean][] = [];
  if ("items" in field && field.node?.kind === "sequence") {
    field.items.forEach((item, index) => {
      commits.push([`${item.id} removed`, { kind: "remove-item", path: item.path }, false]);
      if (index > 0) {
        commits.push([
          `${item.id} up`,
          { kind: "move-item", path: item.path, to: index - 1 },
          false,
        ]);
      }
      if (index < field.items.length - 1) {
        commits.push([
          `${item.id} down`,
          { kind: "move-item", path: item.path, to: index + 1 },
          false,
        ]);
      }
    });
    if (field.kind === "choices" && field.next !== null && "options" in field.next) {
      const present = field.items.map((item) => ("value" in item ? item.value : undefined));
      field.next.options.forEach((option) => {
        if (present.includes(option.value)) return;
        const commit: Commit = {
          kind: "insert-item",
          path: field.path,
          index: field.items.length,
          value: option.value,
        };
        commits.push([`${field.id} checks ${String(option.value)}`, commit, true]);
      });
    } else if (field.next !== null) {
      const leaf = firstScalar(field.next);
      if (leaf !== null) {
        const [scalar, value] = leaf;
        commits.push([`${scalar.id} inserted`, { path: scalar.path, value }, true]);
      }
    }
    commits.push(...newCollections([...field.items, ...(field.next === null ? [] : [field.next])]));
  }
  if ("children" in field && field.entryTemplate !== null && field.node?.kind === "mapping") {
    for (const child of field.children) {
      commits.push([`${child.id} removed`, { kind: "remove-entry", path: child.path }, false]);
    }
    const toNewEntry = (path: Commit["path"]): Commit["path"] => [
      ...field.path,
      "new-entry",
      ...path.slice(field.path.length + 1),
    ];
    const leaf = firstScalar(field.entryTemplate);
    if (leaf !== null) {
      const [scalar, value] = leaf;
      commits.push([
        `${field.id}.new-entry inserted`,
        { path: toNewEntry(scalar.path), value },
        true,
      ]);
    }
    commits.push(...newCollections(field.children));
    commits.push(...newCollections([field.entryTemplate], toNewEntry));
  }
  return commits;
}

/** Comments of `text`, sorted, so a move that carries a comment with its item compares equal. */
export const sortedComments = (text: string): string[] => [...commentsOf(text)].sort();

/** Outcome of the structural commits of one form: the failed invariants, and the commits written. */
export interface StructuralOutcome {
  readonly failures: readonly string[];
  readonly written: number;
}

/**
 * Makes every structural commit of the form `state` of `text`, each on the original text, and
 * checks the invariants of the golden test on each written commit.
 */
export function checkStructuralCommits(
  commits: CommitService,
  state: FormReady,
  text: string,
): StructuralOutcome {
  const comments = sortedComments(text);
  const failures: string[] = [];
  let written = 0;
  for (const [field, parent] of collectionSites(state.model.root)) {
    for (const [label, commit, inserts] of structuralCommits(field)) {
      const result = commits.commit(state, text, commit);
      if (result.status === "refused") {
        const allowed = field.lock !== null ? REFUSALS.locked : REFUSALS.comment;
        if (result.reason !== allowed) failures.push(`${label}: refused, ${result.reason}`);
        continue;
      }
      if (result.status === "unchanged") {
        failures.push(`${label}: unchanged`);
        continue;
      }
      written += 1;
      const after = result.text;
      if (JSON.stringify(sortedComments(after)) !== JSON.stringify(comments)) {
        failures.push(`${label}: comments changed`);
      }
      if (inserts) {
        const at = firstDifference(text, after);
        if (!changesOnly(text, after, at, at)) failures.push(`${label}: not an insertion`);
        continue;
      }
      if (field.node?.range == null) continue;
      const [start, end] = entryRegion(text, field, parent);
      if (!changesOnly(text, after, start, end)) {
        failures.push(`${label}: changed bytes outside its collection`);
      }
    }
  }
  return { failures, written };
}
