import { describe, expect, it } from "vitest";
import {
  buildFormModel,
  buildOutline,
  fieldTrail,
  issue,
  IssueIndex,
  restrictToIssues,
  searchOutline,
  type FormModel,
  type Issue,
  type JsonValue,
  type OutlineEntry,
} from "../../../src/domain";
import { YamlDocumentParser } from "../../../src/infrastructure";
import { schemaSet } from "../../support/schemas";

const parser = new YamlDocumentParser();

const SCHEMA: JsonValue = {
  type: "object",
  "x-unfilled": ["open"],
  properties: {
    title: { type: "string" },
    epistemic_aim: { enum: ["description", "prediction"] },
    subject: {
      type: "object",
      properties: { system: { type: "string", "x-kind": "label" }, note: { type: "string" } },
    },
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: { count: { type: "integer" }, name: { type: "string" } },
      },
    },
    tags: { type: "array", items: { type: "string" } },
    kinds: { type: "array", uniqueItems: true, items: { enum: ["a", "b"] } },
  },
};

const TEXT = [
  "title: Pendulum",
  "subject:",
  "  system: pendulum",
  "rows:",
  "  - count: 1",
  "    name: bob",
  "  - count: 2",
  "    name: open",
  "tags: [x, open]",
  "kinds: [a]",
  "",
].join("\n");

function model(text = TEXT): FormModel {
  return buildFormModel(schemaSet({ "s.json": SCHEMA }), parser.parse(text), text);
}

function outline(issues: readonly Issue[] = []): OutlineEntry[] {
  const built = model();
  return buildOutline(built, IssueIndex.of(built, issues));
}

/** Names of `entries`, nested as arrays after the name of each section. */
function names(entries: readonly OutlineEntry[]): unknown[] {
  return entries.map((entry) => (entry.section ? [entry.name, names(entry.children)] : entry.name));
}

describe("outline of a form", () => {
  it("nests one entry per group, collection and field, in the order of the form", () => {
    expect(names(outline())).toEqual([
      "title",
      "epistemic aim",
      ["subject", ["system", "note"]],
      [
        "rows",
        [
          ["bob", ["count", "name"]],
          ["#2", ["count", "name"]],
        ],
      ],
      ["tags", []],
      "kinds",
    ]);
  });

  it("lists the items of a sequence of scalars only on demand", () => {
    const built = model();
    const tags = (scalarItems: boolean): unknown =>
      names(buildOutline(built, IssueIndex.of(built, []), { scalarItems })).at(-2);
    expect(tags(false)).toEqual(["tags", []]);
    expect(tags(true)).toEqual(["tags", ["x", "#2"]]);
  });

  it("counts the issues of the omitted items of a sequence of scalars at its entry", () => {
    const tags = outline([issue(["tags", 0], "minLength", "too short")])[4];
    expect(tags).toMatchObject({ name: "tags", issueCount: 1, children: [] });
  });

  it("marks the entries with issues, and counts the issues within each section", () => {
    const entries = outline([
      issue(["rows", 1, "name"], "required", "missing", { missing: true }),
      issue(["rows", 1, "count"], "minimum", "too small"),
      issue(["title"], "word-count", "long", { severity: "warning" }),
    ]);
    const rows = entries[3];
    expect(entries[0]).toMatchObject({ mark: "warning", issueCount: 1 });
    expect(rows).toMatchObject({ mark: null, issueCount: 2 });
    expect(rows?.children[1]?.children.map((entry) => entry.mark)).toEqual(["invalid", "missing"]);
  });

  it("restricts the outline to the entries holding an issue, keeping their sections", () => {
    const entries = restrictToIssues(
      outline([issue(["rows", 1, "name"], "required", "missing", { missing: true })]),
    );
    expect(names(entries)).toEqual([["rows", [["#2", ["name"]]]]]);
    expect(restrictToIssues(outline())).toEqual([]);
  });

  it("finds the entries whose name or key holds every word of the query", () => {
    const entries = outline();
    const found = (query: string): string[] =>
      searchOutline(entries, query).map(({ entry, trail }) => [...trail, entry.name].join(" › "));
    expect(found("NAME")).toEqual(["rows › bob › name", "rows › #2 › name"]);
    expect(found("epistemic_aim")).toEqual(["epistemic aim"]);
    expect(found("aim epist")).toEqual(["epistemic aim"]);
    expect(found("  ")).toEqual([]);
  });

  it("names a field by the trail of its entries, and returns null for an unknown path", () => {
    const built = model();
    expect(fieldTrail(built, ["rows", 0, "count"])).toEqual(["rows", "bob", "count"]);
    expect(fieldTrail(built, ["absent"])).toBeNull();
  });
});

describe("places of the issues of each mark", () => {
  it("lists each place once per mark, in the order of the issues, without the unplaced ones", () => {
    const built = model();
    const index = IssueIndex.of(built, [
      issue(["title"], "a", "first", { missing: true }),
      issue(["rows", 0, "count"], "b", "second"),
      issue(["title"], "c", "again", { missing: true }),
      issue(["title"], "d", "invalid"),
      issue([], "e", "root"),
    ]);
    const ids = Object.fromEntries(
      Object.entries(index.placesByMark()).map(([mark, places]) => [
        mark,
        places.map(({ id }) => id),
      ]),
    );
    expect(ids).toEqual({ missing: ["title"], invalid: ["rows[0].count", "title"], warning: [] });
  });
});
