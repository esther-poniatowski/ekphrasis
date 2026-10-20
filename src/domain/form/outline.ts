/**
 * Outline of a form: one entry per group, collection and field of the form model, nested as the
 * form nests them, with the issues of each entry, as the feature note on the outline specifies.
 *
 * The outline is plain data derived from the form model and its issues, so the outline panel,
 * the search of fields and the summary of issues name a field the same way.
 */
import type { YamlPath } from "../model";
import { dominantMark, type IssueIndex, type IssueMark } from "../validation/issues";
import type { Field, FormModel } from "./model";
import { fieldChain } from "./navigation";

export interface OutlineEntry {
  /** Printed field path of the field, which designates it in the form. */
  readonly id: string;
  /** Identity of the field, which keys the folded state of its entry. */
  readonly uid: string;
  readonly path: YamlPath;
  /** Name of the entry: the label of its field, or the value naming an item. */
  readonly name: string;
  /** Whether the field is a group or a collection, whose entry holds the entries of its fields. */
  readonly section: boolean;
  /** Mark of the issues displayed at the field, or `null` when it has none. */
  readonly mark: IssueMark | null;
  /** Number of the issues at the field or below it, wherever they display. */
  readonly issueCount: number;
  readonly children: readonly OutlineEntry[];
}

/** Entry of the outline matched by a search, with the names of the entries containing it. */
export interface OutlineMatch {
  readonly entry: OutlineEntry;
  /** Names of the entries from the top of the outline down to the entry, the entry excluded. */
  readonly trail: readonly string[];
}

/** Entries of the fields of `model`, the root excluded, with the issues of `issues`. */
export function buildOutline(model: FormModel, issues: IssueIndex): OutlineEntry[] {
  return displayedChildren(model.root).map((field) => entryOf(field, issues));
}

/**
 * Entries holding an issue, at their field or below it, each with the entries of its own fields
 * that hold one. Therefore, the restricted outline lists the remaining work in the order of the
 * form.
 */
export function restrictToIssues(entries: readonly OutlineEntry[]): OutlineEntry[] {
  return entries
    .filter((entry) => entry.issueCount > 0)
    .map((entry) => ({ ...entry, children: restrictToIssues(entry.children) }));
}

/**
 * Entries whose name or key contains every word of `query`, ignoring case and reading
 * underscores and hyphens as spaces, in the order of the outline. An empty query matches nothing.
 */
export function searchOutline(entries: readonly OutlineEntry[], query: string): OutlineMatch[] {
  const words = normalized(query).split(" ").filter(Boolean);
  if (words.length === 0) return [];
  const matches: OutlineMatch[] = [];
  const visit = (list: readonly OutlineEntry[], trail: readonly string[]): void => {
    for (const entry of list) {
      const key = entry.path.at(-1);
      const text = normalized(`${entry.name} ${typeof key === "string" ? key : ""}`);
      if (words.every((word) => text.includes(word))) matches.push({ entry, trail });
      visit(entry.children, [...trail, entry.name]);
    }
  };
  visit(entries, []);
  return matches;
}

/**
 * Names of the fields from the top of the form down to the field at `path`, the root excluded,
 * or `null` when the model holds no field at `path`. The summary of issues names a field by
 * this trail, since several fields can share one label.
 */
export function fieldTrail(model: FormModel, path: YamlPath): string[] | null {
  const chain = fieldChain(model.root, path);
  return chain === null ? null : chain.slice(1).map(entryName);
}

/**
 * Name of the entry of `field`. An item of a sequence is named by the value of its first field of
 * kind `label` or `text` when that field is filled, and by its position otherwise. A scalar item
 * of one of these kinds is named by its own value.
 */
export function entryName(field: Field): string {
  if (typeof field.path.at(-1) !== "number") return field.label;
  const naming = "children" in field ? field.children.find(isNamingKind) : field;
  return naming !== undefined && isNamingKind(naming) && isFilledText(naming)
    ? naming.value
    : field.label;
}

const isNamingKind = (field: Field): boolean => field.kind === "label" || field.kind === "text";

/** Whether `field` holds a filled string, which can name its item. */
function isFilledText(field: Field): field is Field & { readonly value: string } {
  return (
    !field.unfilled &&
    "value" in field &&
    typeof field.value === "string" &&
    field.value.trim() !== ""
  );
}

function entryOf(field: Field, issues: IssueIndex): OutlineEntry {
  const children = displayedChildren(field);
  return {
    id: field.id,
    uid: field.uid,
    path: field.path,
    name: entryName(field),
    section: field.kind !== "choices" && ("children" in field || "items" in field),
    mark: dominantMark(issues.at(field.id)),
    issueCount: issues.countWithin(field.path),
    children: children.map((child) => entryOf(child, issues)),
  };
}

/**
 * Fields displayed inside `field`: the fields of a mapping, those of the alternative that its
 * value matches for the kind `alternatives`, and the items of a sequence. The checked values of
 * a field of kind `choices` form one control, so they hold no entries.
 */
function displayedChildren(field: Field): readonly Field[] {
  if (field.kind === "choices") return [];
  if ("children" in field) {
    const selected = field.selectedAlternative;
    return selected === null
      ? field.children
      : (field.alternativeChildren[selected] ?? field.children);
  }
  return "items" in field ? field.items : [];
}

function normalized(text: string): string {
  return text.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}
