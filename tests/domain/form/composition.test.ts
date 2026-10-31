import { describe, expect, it } from "vitest";
import {
  buildFormModel,
  compositionConflicts,
  identifierDeclaration,
  SchemaView,
  type FormModel,
  type JsonValue,
} from "../../../src/domain";
import { YamlDocumentParser } from "../../../src/infrastructure";
import { fieldAt } from "../../support/form-fields";
import { schemaSet } from "../../support/schemas";

const parser = new YamlDocumentParser();

/** Schema documents in which the root composes the base `base.json` by `allOf`. */
function composed(root: JsonValue, base: JsonValue): Record<string, JsonValue> {
  return { "root.json": root, "base/base.json": base };
}

function build(documents: Record<string, JsonValue>, text: string): FormModel {
  return buildFormModel(schemaSet(documents), parser.parse(text), text);
}

const BASE = {
  title: "Note",
  type: "object",
  required: ["id"],
  "x-identifier": "id",
  "x-unfilled": ["open"],
  properties: {
    id: { type: "string", "x-kind": "label" },
    role: { type: "string", description: "Role of the note." },
    status: {
      oneOf: [
        { const: "draft", description: "Being written." },
        { const: "final", description: "Accepted." },
        { const: "retired", description: "Withdrawn." },
      ],
    },
    gloss: { type: "string" },
  },
};

describe("composition by allOf in the form", () => {
  it("adds the properties and the required keys of each subschema, bases first", () => {
    const model = build(
      composed(
        {
          allOf: [{ $ref: "base/base.json" }, { required: ["gloss"] }],
          required: ["role"],
          properties: { extra: { type: "number" } },
        },
        BASE,
      ),
      "id: a\n",
    );
    if (model.root.kind !== "group") throw new Error("expected a group");
    expect(model.root.children.map((field) => [field.key, field.required])).toEqual([
      ["id", true],
      ["role", true],
      ["status", false],
      ["gloss", true],
      ["extra", false],
    ]);
  });

  it("gives an open string narrowed by an enum one field with the choice control of the enum", () => {
    const model = build(
      composed(
        {
          allOf: [{ $ref: "base/base.json" }],
          properties: { role: { enum: ["lead", "support"] } },
        },
        BASE,
      ),
      "role: lead\n",
    );
    if (model.root.kind !== "group") throw new Error("expected a group");
    expect(model.root.children.filter((field) => field.key === "role")).toHaveLength(1);
    expect(fieldAt(model.root, "role")).toMatchObject({
      kind: "choice",
      value: "lead",
      description: "Role of the note.",
      options: [{ value: "lead" }, { value: "support" }],
    });
  });

  it("keeps the described options of the base that the narrowing enum admits", () => {
    const model = build(
      composed(
        {
          allOf: [{ $ref: "base/base.json" }],
          properties: { status: { enum: ["final", "draft"] } },
        },
        BASE,
      ),
      "",
    );
    if (model.root.kind !== "group") throw new Error("expected a group");
    expect(fieldAt(model.root, "status")).toMatchObject({
      kind: "choice",
      options: [
        { value: "final", description: "Accepted." },
        { value: "draft", description: "Being written." },
      ],
    });
  });

  it("lets an enum written over a text kind of the base yield the kind choice", () => {
    const model = build(
      composed(
        { allOf: [{ $ref: "base/base.json" }], properties: { id: { enum: ["a", "b"] } } },
        BASE,
      ),
      "",
    );
    if (model.root.kind !== "group") throw new Error("expected a group");
    expect(fieldAt(model.root, "id")).toMatchObject({ kind: "choice" });
  });

  it("keeps a kind that the narrowing schema declares itself", () => {
    const model = build(
      composed(
        {
          allOf: [{ $ref: "base/base.json" }],
          properties: { status: { "x-kind": "label" } },
        },
        BASE,
      ),
      "",
    );
    if (model.root.kind !== "group") throw new Error("expected a group");
    expect(fieldAt(model.root, "status")).toMatchObject({ kind: "label" });
  });

  it("checks the rules of every subschema", () => {
    const model = build(
      composed(
        {
          allOf: [{ $ref: "base/base.json" }],
          properties: { gloss: { "x-rules": [{ check: "word-count", max: 5 }] } },
        },
        {
          type: "object",
          properties: { gloss: { type: "string", "x-rules": [{ check: "pattern", regex: "x" }] } },
        },
      ),
      "",
    );
    if (model.root.kind !== "group") throw new Error("expected a group");
    expect(fieldAt(model.root, "gloss").rules).toEqual([
      { check: "word-count", max: 5 },
      { check: "pattern", regex: "x" },
    ]);
  });
});

describe("root keywords read through allOf", () => {
  const root = (own: Record<string, JsonValue>): SchemaView =>
    SchemaView.root(schemaSet(composed({ allOf: [{ $ref: "base/base.json" }], ...own }, BASE)));

  it("finds the identifier, the unfilled values and the title of the base", () => {
    const view = root({});
    expect(identifierDeclaration(view)).toEqual({ status: "declared", path: ["id"] });
    expect(view.unfilledValues).toEqual(["open"]);
    expect(view.title).toBe("Note");
  });

  it("takes the nearest declaration first", () => {
    const view = root({ "x-unfilled": ["tbd"], title: "Consumer note" });
    expect(view.unfilledValues).toEqual(["tbd"]);
    expect(view.title).toBe("Consumer note");
  });

  it("reads breadth-first: a direct subschema before a subschema composed through it", () => {
    const view = SchemaView.root(
      schemaSet({
        "root.json": { allOf: [{ $ref: "far.json" }, { "x-kind": "group" }] },
        "far.json": { "x-kind": "keyed-table" },
      }),
    );
    expect(view.declaredKind).toBe("group");
  });

  it("finds the `_schema` constant of the root among the merged properties", () => {
    const view = root({ properties: { _schema: { const: "vault:note@1" } } });
    const declared = view.properties().find(({ key }) => key === "_schema");
    expect(declared?.schema.constValue).toEqual({ value: "vault:note@1" });
  });
});

describe("conflicting constraints of composed subschemas", () => {
  it("reports types without a common name, and follows the nearest declaration", () => {
    const documents = composed(
      { allOf: [{ $ref: "base/base.json" }], properties: { gloss: { type: "number" } } },
      BASE,
    );
    const model = build(documents, "");
    if (model.root.kind !== "group") throw new Error("expected a group");
    expect(fieldAt(model.root, "gloss")).toMatchObject({ kind: "number" });
    expect(compositionConflicts(SchemaView.root(schemaSet(documents)))).toEqual([
      {
        path: "gloss",
        message:
          "The subschemas composed by `$ref` or `allOf` admit no common type: [number] against [string]. The form follows the nearest declaration.",
      },
    ]);
  });

  it("reports enumerations without a common value, and offers the nearest one", () => {
    const documents = composed(
      { allOf: [{ $ref: "base/base.json" }], properties: { status: { enum: ["open-ended"] } } },
      BASE,
    );
    const model = build(documents, "");
    if (model.root.kind !== "group") throw new Error("expected a group");
    expect(fieldAt(model.root, "status")).toMatchObject({ options: [{ value: "open-ended" }] });
    expect(compositionConflicts(SchemaView.root(schemaSet(documents)))).toEqual([
      {
        path: "status",
        message:
          "The subschemas composed by `$ref` or `allOf` admit no common value: [open-ended] against [draft, final, retired]. The form follows the nearest declaration.",
      },
    ]);
  });

  it("reports alternatives declared by several subschemas", () => {
    const alternatives = (key: string): JsonValue => ({
      oneOf: [{ properties: { [key]: {} } }, { properties: { [`${key}2`]: {} } }],
    });
    const documents = composed(
      { allOf: [{ $ref: "base/base.json" }], properties: { kind: alternatives("a") } },
      { properties: { kind: alternatives("b") } },
    );
    const conflicts = compositionConflicts(SchemaView.root(schemaSet(documents)));
    expect(conflicts.map(({ path }) => path)).toEqual(["kind"]);
    expect(conflicts[0]?.message).toMatch(/^Several subschemas composed/);
  });

  it("reports nothing for a narrowing that a control expresses", () => {
    const documents = composed(
      {
        allOf: [{ $ref: "base/base.json" }],
        properties: {
          role: { enum: ["lead"] },
          status: { enum: ["final"] },
          gloss: { type: ["string", "null"] },
          id: { type: "string" },
        },
      },
      { ...BASE, properties: { ...BASE.properties, count: { type: "number" } } },
    );
    expect(compositionConflicts(SchemaView.root(schemaSet(documents)))).toEqual([]);
  });

  it("counts an integer as a number", () => {
    const documents = composed(
      { allOf: [{ $ref: "base/base.json" }], properties: { count: { type: "integer" } } },
      { properties: { count: { type: "number" } } },
    );
    expect(compositionConflicts(SchemaView.root(schemaSet(documents)))).toEqual([]);
    expect(SchemaView.root(schemaSet(documents)).properties()[0]?.schema.types).toEqual([
      "integer",
    ]);
  });
});
