/**
 * Exit criterion of the milestone *Saving of scalars*: the golden test of byte preservation.
 *
 * Every scalar field of every bound fixture receives three commits, each on the original text:
 * an edit that keeps the style of the value, an edit that forces another style, and a clear.
 * Each commit is either written or refused for one of the reasons that the plan of commits
 * lists for locked values, items and flow mappings. A written commit keeps every comment, and
 * changes no byte outside the lines of its entry; an absent field is written by an insertion,
 * which leaves the old text whole.
 */
import { describe, expect, it } from "vitest";
import { CommitService, DEFAULT_SETTINGS, FormService } from "../../src/application";
import {
  isScalarKind,
  REFUSALS,
  type Field,
  type ScalarField,
  type ScalarValue,
} from "../../src/domain";
import { FileSchemaLoader, YamlDocumentParser, YamlSourceEditor } from "../../src/infrastructure";
import { DirectoryFileSource, FIXTURE_BINDINGS, FIXTURE_RULES } from "../support/fixture-vault";
import { commentsOf } from "../support/yaml-comments";
import { FIXTURES_ROOT, readYamlFiles } from "../support/yaml-files";

const parser = new YamlDocumentParser();
const forms = new FormService(
  parser,
  new FileSchemaLoader(new DirectoryFileSource(FIXTURES_ROOT)),
  () => ({ ...DEFAULT_SETTINGS, pathRules: FIXTURE_RULES }),
);
const commits = new CommitService(parser, new YamlSourceEditor());

const records = readYamlFiles(FIXTURES_ROOT).filter(
  ({ name }) => FIXTURE_BINDINGS[name.split("\\").join("/")] !== undefined,
);

/** Scalar fields of the tree under `field`, each with its parent. */
function scalarSites(field: Field, parent: Field | null = null): [ScalarField, Field | null][] {
  const own: [ScalarField, Field | null][] = isScalarKind(field.kind)
    ? [[field as ScalarField, parent]]
    : [];
  const children = "children" in field ? field.children : "items" in field ? field.items : [];
  return [...own, ...children.flatMap((child) => scalarSites(child, field))];
}

/** Commits of one field: a value keeping its style, a value forcing another style, a clear. */
function variants(field: ScalarField): [string, ScalarValue][] {
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
function entryRegion(text: string, field: ScalarField, parent: Field | null): [number, number] {
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
function changesOnly(before: string, after: string, start: number, end: number): boolean {
  const head = before.slice(0, start);
  const tail = before.slice(end);
  return (
    after.length >= head.length + tail.length && after.startsWith(head) && after.endsWith(tail)
  );
}

/** Offset of the first byte where `before` and `after` differ, a candidate insertion point. */
function firstDifference(before: string, after: string): number {
  let offset = 0;
  while (offset < before.length && before[offset] === after[offset]) offset += 1;
  return offset;
}

/** Whether `field` lies in a collection written between brackets or braces. */
const inFlow = (parent: Field | null): boolean =>
  (parent?.node?.kind === "mapping" || parent?.node?.kind === "sequence") && parent.node.flow;

describe("golden test of byte preservation", () => {
  it("binds the construct fixtures holding block scalars and trailing comments", () => {
    expect(records.map(({ name }) => name)).toEqual(
      expect.arrayContaining(["constructs/block-scalars.yml", "constructs/anchors.yml"]),
    );
  });

  describe.each(records)("$name", ({ name, text }) => {
    it("writes every scalar field, changing only the lines of its entry", async () => {
      const state = await forms.open(name, text);
      if (state.status !== "form") throw new Error(`Expected a form, got ${state.status}.`);
      const sites = scalarSites(state.model.root);
      expect(sites.length).toBeGreaterThan(0);
      const comments = commentsOf(text);
      const failures: string[] = [];
      let written = 0;

      for (const [field, parent] of sites) {
        for (const [variant, value] of variants(field)) {
          const label = `${field.id} ${variant}`;
          const result = commits.commit(state, text, { path: field.path, value });
          if (result.status === "refused") {
            const expected =
              field.lock !== null
                ? REFUSALS.locked
                : value === null && typeof field.path.at(-1) === "number"
                  ? REFUSALS.item
                  : inFlow(parent)
                    ? REFUSALS.flow
                    : null;
            if (result.reason !== expected) failures.push(`${label}: refused, ${result.reason}`);
            continue;
          }
          if (result.status === "unchanged") continue;
          written += 1;
          const after = result.text;
          if (JSON.stringify(commentsOf(after)) !== JSON.stringify(comments)) {
            failures.push(`${label}: comments changed`);
          }
          if (field.node === null) {
            const at = firstDifference(text, after);
            if (!changesOnly(text, after, at, at)) failures.push(`${label}: not an insertion`);
            continue;
          }
          const [allowedStart, allowedEnd] = entryRegion(text, field, parent);
          if (!changesOnly(text, after, allowedStart, allowedEnd)) {
            failures.push(`${label}: changed bytes outside its entry`);
          }
        }
      }

      expect(failures, failures.join("\n")).toEqual([]);
      expect(written).toBeGreaterThan(sites.length);
    });
  });
});
