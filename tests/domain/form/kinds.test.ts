import { describe, expect, it } from "vitest";
import { choiceOptions, resolveKind, type JsonValue } from "../../../src/domain";
import { view } from "../../support/schemas";

const kindOf = (schema: JsonValue): string | null => resolveKind(view(schema)).kind;

describe("derivation of field kinds", () => {
  it.each<[string, JsonValue, string | null]>([
    ["string", { type: "string" }, "text"],
    ["nullable string", { type: ["null", "string"] }, "text"],
    ["integer", { type: "integer" }, "number"],
    ["boolean", { type: "boolean" }, "boolean"],
    ["enum", { enum: ["a", "b"] }, "choice"],
    ["oneOf of const", { oneOf: [{ const: 1 }, { const: 2 }] }, "choice"],
    ["single const", { const: 1 }, "choice"],
    [
      "unique enumerated items",
      { type: "array", uniqueItems: true, items: { enum: ["a"] } },
      "choices",
    ],
    ["repeatable enumerated items", { type: "array", items: { enum: ["a"] } }, "list"],
    ["scalar items", { type: "array", items: { type: "string" } }, "list"],
    ["no items", { type: "array" }, "list"],
    ["object properties", { type: "object", properties: { a: { type: "string" } } }, "group"],
    [
      "scalar rows",
      { type: "array", items: { properties: { a: { type: "string" }, b: { enum: [1] } } } },
      "table",
    ],
    ["nested rows", { type: "array", items: { properties: { a: { type: "array" } } } }, "records"],
    [
      "keyed scalar rows",
      { type: "object", additionalProperties: { properties: { a: { type: "string" } } } },
      "keyed-table",
    ],
    [
      "keyed nested rows",
      { type: "object", patternProperties: { "^x": { properties: { a: { type: "object" } } } } },
      "keyed-records",
    ],
    ["map of scalars", { type: "object", additionalProperties: { enum: ["open"] } }, "group"],
    [
      "object alternatives",
      { oneOf: [{ properties: { a: {} } }, { properties: { b: {} } }] },
      "alternatives",
    ],
    ["no keyword", {}, null],
  ])("derives the kind of %s", (_, schema, kind) => {
    expect(kindOf(schema)).toBe(kind);
  });

  it("lets x-kind override the derived kind", () => {
    expect(kindOf({ type: "string", "x-kind": "latex" })).toBe("latex");
    expect(
      kindOf({ type: "array", items: { properties: { a: { type: "array" } } }, "x-kind": "table" }),
    ).toBe("table");
  });

  it("derives the kind when x-kind names no kind, and reports the name", () => {
    expect(resolveKind(view({ type: "string", "x-kind": "formula" }))).toEqual({
      kind: "text",
      unknownDeclaredKind: "formula",
    });
  });

  it("terminates on a recursive schema", () => {
    const tree = {
      $defs: {
        node: { type: "array", items: { properties: { children: { $ref: "#/$defs/node" } } } },
      },
      $ref: "#/$defs/node",
    };
    expect(kindOf(tree)).toBe("records");
  });

  it("collects the options of a choice with their annotations", () => {
    expect(
      choiceOptions(view({ oneOf: [{ const: "noun", title: "Noun", description: "An object" }] })),
    ).toEqual([{ value: "noun", title: "Noun", description: "An object" }]);
    expect(choiceOptions(view({ enum: [1, [2], null] }))).toEqual([
      { value: 1, title: null, description: null },
      { value: null, title: null, description: null },
    ]);
    expect(choiceOptions(view({ type: "string" }))).toBeNull();
  });
});
