import { describe, expect, it } from "vitest";
import { SchemaReferenceError, SchemaLoadError } from "../../../src/errors";
import { SchemaSet, SchemaView } from "../../../src/domain";
import { schemaSet } from "../../support/schemas";

describe("schema set", () => {
  it("follows local, cross-file, anchor and identifier references", () => {
    const set = schemaSet({
      "schemas/main.schema.yaml": {
        properties: {
          local: { $ref: "#/$defs/local" },
          shared: { $ref: "common/defs.schema.yaml#/$defs/id" },
          anchored: { $ref: "common/defs.schema.yaml#label" },
          byId: { $ref: "https://example.org/defs#/$defs/id" },
        },
        $defs: { local: { title: "Local" } },
      },
      "schemas/common/defs.schema.yaml": {
        $id: "https://example.org/defs",
        $defs: {
          id: { title: "Identifier", $ref: "#/$defs/base" },
          base: { type: "string", description: "Base" },
          label: { $anchor: "label", title: "Label" },
        },
      },
    });
    const titles = SchemaView.root(set)
      .properties()
      .map(({ key, schema }) => [key, schema.title, schema.types]);
    expect(titles).toEqual([
      ["local", "Local", []],
      ["shared", "Identifier", ["string"]],
      ["anchored", "Label", []],
      ["byId", "Identifier", ["string"]],
    ]);
  });

  it("lets a keyword beside a $ref override the referenced keyword", () => {
    const set = schemaSet({
      "a.json": {
        properties: { x: { $ref: "#/$defs/x", title: "Own" } },
        $defs: { x: { title: "Ref", type: "number" } },
      },
    });
    const [property] = SchemaView.root(set).properties();
    expect([property?.schema.title, property?.schema.types]).toEqual(["Own", ["number"]]);
  });

  it("lists its documents, root first", () => {
    const set = schemaSet({ "b.json": { $ref: "a.json" }, "a.json": {} });
    expect(set.paths).toEqual(["b.json", "a.json"]);
  });

  it("rejects a reference to no schema when it is built", () => {
    expect(() => schemaSet({ "a.json": { $ref: "#/$defs/missing" } })).toThrow(
      SchemaReferenceError,
    );
    expect(() => schemaSet({ "a.json": { $ref: "other.json" } })).toThrow(/designates no loaded/);
  });

  it("rejects a chain of references that loops", () => {
    expect(() =>
      schemaSet({ "a.json": { $defs: { x: { $ref: "#/$defs/y" }, y: { $ref: "#/$defs/x" } } } }),
    ).toThrow(/loops/);
  });

  it("requires its root document", () => {
    expect(() => new SchemaSet("missing.json", [])).toThrow(SchemaLoadError);
  });

  it("reads the schema false as admitting no value", () => {
    const set = schemaSet({ "a.json": { properties: { never: false } } });
    expect(SchemaView.root(set).properties()[0]?.schema.rejectsAll).toBe(true);
  });
});
