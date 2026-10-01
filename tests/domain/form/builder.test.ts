import { describe, expect, it } from "vitest";
import { buildFormModel, type FormModel, type JsonValue } from "../../../src/domain";
import { YamlDocumentParser } from "../../../src/infrastructure";
import { fieldAt } from "../../support/form-fields";
import { schemaSet } from "../../support/schemas";

const parser = new YamlDocumentParser();

function build(schema: JsonValue, text: string): FormModel {
  return buildFormModel(schemaSet({ "s.json": schema }), parser.parse(text), text);
}

describe("form model", () => {
  it("follows the order of the schema, with labels, requirements and values", () => {
    const model = build(
      {
        title: "Record",
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", "x-kind": "label" },
          status: { title: "Status", enum: ["posed", "answered"] },
          count: { type: "integer" },
        },
      },
      "count: 3\nid: q1\n",
    );
    expect(model.title).toBe("Record");
    const root = model.root;
    expect(root.kind).toBe("group");
    if (root.kind !== "group") return;
    expect(
      root.children.map((field) => [field.id, field.label, field.kind, field.required]),
    ).toEqual([
      ["id", "id", "label", true],
      ["status", "Status", "choice", false],
      ["count", "count", "number", false],
    ]);
    expect(fieldAt(root, "id")).toMatchObject({ value: "q1", node: { kind: "scalar" } });
    expect(fieldAt(root, "status")).toMatchObject({ value: null, node: null });
    expect(fieldAt(root, "status")).toMatchObject({
      options: [{ value: "posed" }, { value: "answered" }],
    });
  });

  it("builds the fields of keys admitted by a pattern, and lists the other keys apart", () => {
    const model = build(
      {
        type: "object",
        properties: { a: { type: "string" } },
        patternProperties: { "^x-": { type: "number" } },
        additionalProperties: false,
      },
      "other: [1, 2]\nx-size: 4\na: text\n",
    );
    const root = model.root;
    if (root.kind !== "group") throw new Error("expected a group");
    expect(root.children.map((field) => [field.id, field.kind])).toEqual([
      ["a", "text"],
      ["x-size", "number"],
    ]);
    expect(root.extraEntries).toEqual([{ id: "other", key: "other", text: "[1, 2]" }]);
  });

  it("reads a declared key with spaces, and keeps the keys admitted by a pattern verbatim", () => {
    const model = build(
      {
        type: "object",
        properties: { empty_hint: { type: "string" }, "foil-set": { type: "string" } },
        additionalProperties: { type: "string" },
      },
      "damping-ratio: x\n",
    );
    expect(fieldAt(model.root, "empty_hint").label).toBe("empty hint");
    expect(fieldAt(model.root, "foil-set").label).toBe("foil set");
    expect(fieldAt(model.root, "damping-ratio").label).toBe("damping-ratio");
  });

  it("builds the items of sequences and the entries of keyed records", () => {
    const model = build(
      {
        type: "object",
        properties: {
          rows: { type: "array", items: { properties: { name: { type: "string" } } } },
          terms: {
            type: "object",
            additionalProperties: { properties: { tags: { type: "array" } } },
          },
        },
      },
      "rows:\n  - name: a\n  - name: b\nterms:\n  t-1:\n    tags: [x]\n",
    );
    expect(fieldAt(model.root, "rows").kind).toBe("table");
    expect(fieldAt(model.root, "rows[1].name")).toMatchObject({ value: "b", label: "name" });
    expect(fieldAt(model.root, "rows[0]").label).toBe("#1");
    expect(fieldAt(model.root, "terms").kind).toBe("keyed-records");
    expect(fieldAt(model.root, "terms.t-1.tags[0]")).toMatchObject({ value: "x", kind: "text" });
  });

  it("locks the values reached through an alias or a merge key", () => {
    const text = [
      "defaults: &defaults",
      "  unit: radian",
      "  precision: 3",
      "nominal: &nominal 9.81",
      "case:",
      "  <<: *defaults",
      "  gravity: *nominal",
      "  precision: 4",
      "",
    ].join("\n");
    const scalar = { type: ["string", "number"] };
    const model = build(
      {
        type: "object",
        properties: {
          case: {
            type: "object",
            properties: { unit: scalar, precision: scalar, gravity: scalar },
          },
        },
      },
      text,
    );
    expect(fieldAt(model.root, "case.gravity")).toMatchObject({ value: 9.81, lock: "alias" });
    expect(fieldAt(model.root, "case.precision")).toMatchObject({ value: 4, lock: null });
    expect(fieldAt(model.root, "case.unit")).toMatchObject({ value: "radian", lock: "merge" });
  });

  it("displays a value of the wrong shape as text", () => {
    const model = build(
      {
        type: "object",
        properties: { name: { type: "string" }, group: { type: "object", properties: {} } },
      },
      "name:\n  nested: 1\ngroup: open\n",
    );
    expect(fieldAt(model.root, "name").mismatch).toBe("nested: 1\n");
    expect(fieldAt(model.root, "group").mismatch).toBe("open");
  });

  it("selects the alternative whose required keys are present", () => {
    const model = build(
      {
        type: "object",
        properties: {
          link: {
            oneOf: [
              { title: "Declared", required: ["term"], properties: { term: { type: "string" } } },
              {
                title: "Undeclared",
                required: ["undeclared"],
                properties: { undeclared: { type: "string" } },
              },
            ],
          },
        },
      },
      "link:\n  undeclared: quality factor\n",
    );
    const link = fieldAt(model.root, "link");
    expect(link).toMatchObject({
      kind: "alternatives",
      alternatives: ["Declared", "Undeclared"],
      selectedAlternative: 1,
    });
    expect(fieldAt(model.root, "link.undeclared")).toMatchObject({ required: true });
  });

  it("reports an unknown x-kind as a schema issue, and derives the kind", () => {
    const model = build(
      { type: "object", properties: { a: { type: "string", "x-kind": "formula" } } },
      "a: x\n",
    );
    expect(fieldAt(model.root, "a").kind).toBe("text");
    expect(model.schemaIssues).toEqual([
      { path: "a", message: "The keyword `x-kind` names no field kind: `formula`." },
    ]);
  });

  it("builds the declared fields of an empty document", () => {
    const model = build({ type: "object", properties: { a: { type: "string" } } }, "");
    expect(fieldAt(model.root, "a")).toMatchObject({ node: null, value: null });
  });
});
