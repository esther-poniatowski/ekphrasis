import { describe, expect, it } from "vitest";
import { documentUri, validatorDocuments } from "../../../src/domain";
import { schemaSet } from "../../support/schemas";

describe("documents for the validator", () => {
  const schemas = schemaSet({
    "a/root.schema.json": {
      $id: "https://example.org/root.json",
      type: "object",
      properties: {
        id: { $ref: "../c d/common.schema.json#/$defs/id" },
        local: { $ref: "#/$defs/local" },
        byId: { $ref: "https://example.org/common.json#name" },
        nested: { $id: "nested.json", type: "string" },
      },
      $defs: { local: { type: "string" } },
    },
    "c d/common.schema.json": {
      $id: "https://example.org/common.json",
      $defs: { id: { type: "string" }, named: { $anchor: "name", type: "string" } },
    },
  });

  it("registers each document under the URI of its vault path, root first", () => {
    const documents = validatorDocuments(schemas);
    expect(documents.map(({ uri }) => uri)).toEqual([
      "https://vault.ekphrasis.invalid/a/root.schema.json",
      "https://vault.ekphrasis.invalid/c%20d/common.schema.json",
    ]);
    expect(documents[1]?.schema).toMatchObject({ $id: documentUri("c d/common.schema.json") });
  });

  it("rewrites every reference to the schema that ekphrasis resolves, and drops nested identifiers", () => {
    const [root] = validatorDocuments(schemas);
    expect(root?.schema).toMatchObject({
      $id: documentUri("a/root.schema.json"),
      properties: {
        id: { $ref: `${documentUri("c d/common.schema.json")}#/%24defs/id` },
        local: { $ref: `${documentUri("a/root.schema.json")}#/%24defs/local` },
        byId: { $ref: `${documentUri("c d/common.schema.json")}#name` },
        nested: { type: "string" },
      },
    });
    expect(JSON.stringify(root?.schema)).not.toContain("nested.json");
  });
});
