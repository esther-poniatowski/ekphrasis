/**
 * Structural commits through the commit service: insertions, removals and reorderings of items
 * and entries, in block collections and in flow collections, with the exact text each one writes.
 */
import { describe, expect, it } from "vitest";
import { CommitService, type FormReady } from "../../src/application";
import {
  buildFormModel,
  ItemIdentities,
  REFUSALS,
  type Commit,
  type Field,
  type JsonValue,
} from "../../src/domain";
import { YamlDocumentParser, YamlSourceEditor } from "../../src/infrastructure";
import { fieldAt } from "../support/form-fields";
import { schemaSet } from "../support/schemas";
import { createValidation } from "../support/validation";

const parser = new YamlDocumentParser();
const commits = new CommitService(parser, new YamlSourceEditor(), createValidation());

const SCHEMA: JsonValue = {
  type: "object",
  "x-unfilled": ["open"],
  properties: {
    title: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    rows: {
      type: "array",
      items: {
        type: "object",
        required: ["name"],
        properties: { name: { type: "string" }, symbol: { type: "string" } },
      },
    },
    check: {
      type: "object",
      properties: { verdict: { type: "string" }, evidence: { type: "string" } },
    },
    terms: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          label: { type: "string" },
          frames: { type: "array", items: { type: "string" } },
        },
      },
    },
    kinds: { type: "array", uniqueItems: true, items: { enum: ["a", "b", "c"] } },
  },
};

function state(text: string, identities = new ItemIdentities()): FormReady {
  const schemas = schemaSet({ "s.json": SCHEMA });
  const tree = parser.parse(text);
  const model = buildFormModel(schemas, tree, text, identities);
  return {
    status: "form",
    binding: { schemaPath: "s.json", source: "modeline", reference: "s.json" },
    model,
    report: createValidation().validate(schemas, model, tree),
    schemas,
    schemaPaths: ["s.json"],
  };
}

/** Text written by `commit` on `text`, or the reason of its refusal. */
function written(text: string, commit: Commit): string {
  const result = commits.commit(state(text), text, commit);
  if (result.status === "written") return result.text;
  return result.status === "refused" ? `refused: ${result.reason}` : "unchanged";
}

describe("insertion of items", () => {
  it.each([
    ["a block sequence", "tags:\n  - x\n", 1, "tags:\n  - x\n  - w\n"],
    ["a flow sequence", "tags: [x]\n", 1, "tags: [x, w]\n"],
    ["an empty flow sequence", "tags: []\n", 0, "tags: [w]\n"],
    ["an absent sequence", "title: a\n", 0, "title: a\ntags:\n  - w\n"],
    ["a sequence holding an unfilled value", "tags: open\n", 0, "tags:\n  - w\n"],
    ["a sequence holding the null value", "tags:\ntitle: a\n", 0, "tags:\n  - w\ntitle: a\n"],
  ])("appends the next item of %s at its first edit", (_, text, index, expected) => {
    expect(written(text, { path: ["tags", index], value: "w" })).toBe(expected);
  });

  it("appends a row with the edited cell, aligned under its first key", () => {
    const text = "rows:\n  - name: a\n    symbol: b\ntitle: t\n";
    expect(written(text, { path: ["rows", 1, "symbol"], value: "s" })).toBe(
      "rows:\n  - name: a\n    symbol: b\n  - symbol: s\ntitle: t\n",
    );
  });

  it("appends a row to a flow sequence in flow form", () => {
    expect(written("rows: [{name: a}]\n", { path: ["rows", 1, "name"], value: "b" })).toBe(
      "rows: [{name: a}, {name: b}]\n",
    );
  });

  it("inserts an admitted value at its position among the checked values", () => {
    const commit: Commit = { kind: "insert-item", path: ["kinds"], index: 1, value: "b" };
    expect(written("kinds: [a, c]\n", commit)).toBe("kinds: [a, b, c]\n");
    expect(written("kinds:\n  - a\n  - c\n", commit)).toBe("kinds:\n  - a\n  - b\n  - c\n");
  });

  it("refuses a position outside the sequence", () => {
    const commit: Commit = { kind: "insert-item", path: ["kinds"], index: 5, value: "b" };
    expect(written("kinds: [a]\n", commit)).toBe(`refused: ${REFUSALS.position}`);
  });
});

describe("removal of items", () => {
  const block = "tags:\n  - x # first\n  - y\n  - z\ntitle: a\n";

  it("removes the lines of a block item, keeping their comments", () => {
    expect(written(block, { kind: "remove-item", path: ["tags", 1] })).toBe(
      "tags:\n  - x # first\n  - z\ntitle: a\n",
    );
    expect(written(block, { kind: "remove-item", path: ["tags", 0] })).toBe(
      "tags:\n  # first\n  - y\n  - z\ntitle: a\n",
    );
  });

  it("writes an empty flow sequence when the only block item is removed", () => {
    expect(written("rows: # kept\n  - name: a\n", { kind: "remove-item", path: ["rows", 0] })).toBe(
      "rows: [] # kept\n",
    );
  });

  it.each([
    [0, "tags: [y, z]\n"],
    [1, "tags: [x, z]\n"],
    [2, "tags: [x, y]\n"],
  ])("removes the item %i of a flow sequence with one comma", (index, expected) => {
    expect(written("tags: [x, y, z]\n", { kind: "remove-item", path: ["tags", index] })).toBe(
      expected,
    );
  });

  it("empties a flow sequence holding one item", () => {
    expect(written("tags: [x]\n", { kind: "remove-item", path: ["tags", 0] })).toBe("tags: []\n");
  });

  it("writes the unfilled value at a cleared item, which stays in its sequence", () => {
    expect(written("tags:\n  - x\n  - y\n", { path: ["tags", 0], value: null })).toBe(
      "tags:\n  - open\n  - y\n",
    );
  });
});

describe("reordering of items", () => {
  it("moves a block item with the comment of its last line", () => {
    const text = "tags:\n  - x # on x\n  # between\n  - y\ntitle: a\n";
    expect(written(text, { kind: "move-item", path: ["tags", 0], to: 1 })).toBe(
      "tags:\n  - y\n  # between\n  - x # on x\ntitle: a\n",
    );
  });

  it("moves a row of several lines", () => {
    const text = "rows:\n  - name: a\n    symbol: b\n  - name: c\n";
    expect(written(text, { kind: "move-item", path: ["rows", 1], to: 0 })).toBe(
      "rows:\n  - name: c\n  - name: a\n    symbol: b\n",
    );
  });

  it("moves an item of a flow sequence", () => {
    expect(written("tags: [x, y, z]\n", { kind: "move-item", path: ["tags", 2], to: 0 })).toBe(
      "tags: [z, x, y]\n",
    );
  });

  it("keeps the identifier of each item across a move", () => {
    const identities = new ItemIdentities();
    const text = "tags: [x, y, z]\n";
    const before = state(text, identities);
    const keys = (root: Field): string[] => {
      const tags = fieldAt(root, "tags");
      return "items" in tags ? tags.items.map((item) => item.key) : [];
    };
    const [x, y, z] = keys(before.model.root);
    const result = commits.commit(
      before,
      text,
      { kind: "move-item", path: ["tags", 2], to: 0 },
      identities,
    );
    if (result.status !== "written") throw new Error(result.status);
    expect(keys(result.state.model.root)).toEqual([z, x, y]);
  });

  it("gives an appended item the identifier of the next item", () => {
    const identities = new ItemIdentities();
    const text = "tags: [x]\n";
    const before = state(text, identities);
    const tags = fieldAt(before.model.root, "tags");
    const next = "next" in tags ? tags.next?.key : undefined;
    const result = commits.commit(before, text, { path: ["tags", 1], value: "w" }, identities);
    if (result.status !== "written") throw new Error(result.status);
    expect(fieldAt(result.state.model.root, "tags[1]").key).toBe(next);
  });
});

describe("keys of flow mappings", () => {
  it.each([
    [
      "after the preceding key",
      "check: {verdict: x}\n",
      ["check", "evidence"],
      "e",
      "check: {verdict: x, evidence: e}\n",
    ],
    [
      "before the following key",
      "check: {evidence: e}\n",
      ["check", "verdict"],
      "x",
      "check: {verdict: x, evidence: e}\n",
    ],
    ["into an empty mapping", "check: {}\n", ["check", "verdict"], "x", "check: {verdict: x}\n"],
  ])("inserts a key %s", (_, text, path, value, expected) => {
    expect(written(text, { path, value })).toBe(expected);
  });

  it("inserts a key on a line of its own when each entry starts a line", () => {
    const text = "check: {\n    verdict: x,\n  }\n";
    expect(written(text, { path: ["check", "evidence"], value: "e" })).toBe(
      "check: {\n    verdict: x,\n    evidence: e,\n  }\n",
    );
  });

  it.each([
    [["check", "evidence"], "check: {verdict: x}\n"],
    [["check", "verdict"], "check: {evidence: y}\n"],
  ])("removes the cleared key %j with one comma", (path, expected) => {
    expect(written("check: {verdict: x, evidence: y}\n", { path, value: null })).toBe(expected);
  });
});

describe("entries of mappings keyed by identifiers", () => {
  const text = "terms:\n  b-term:\n    label: B\n";

  it("inserts a new entry at its first edit, keeping sorted keys sorted", () => {
    expect(written(text, { path: ["terms", "a-term", "label"], value: "A" })).toBe(
      "terms:\n  a-term:\n    label: A\n  b-term:\n    label: B\n",
    );
    expect(written(text, { path: ["terms", "c-term", "label"], value: "C" })).toBe(
      "terms:\n  b-term:\n    label: B\n  c-term:\n    label: C\n",
    );
  });

  it("removes an entry with its whole value, and empties a mapping left without entry", () => {
    const two = "terms:\n  a-term:\n    label: A\n    frames: [x]\n  b-term:\n    label: B\n";
    expect(written(two, { kind: "remove-entry", path: ["terms", "a-term"] })).toBe(text);
    expect(written(text, { kind: "remove-entry", path: ["terms", "b-term"] })).toBe("terms: {}\n");
  });
});
