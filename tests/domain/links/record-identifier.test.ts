import { describe, expect, it } from "vitest";
import {
  identifierDeclaration,
  identifierDefects,
  readIdentifier,
  SchemaView,
  type JsonValue,
} from "../../../src/domain";
import { schemaSet, view } from "../../support/schemas";

const withIdentifier = (identifier: JsonValue): SchemaView =>
  view({
    type: "object",
    "x-identifier": identifier,
    properties: {
      id: { type: "string" },
      identity: { type: "object", properties: { id: { type: "string" } } },
      kind: {
        oneOf: [{ properties: { code: { type: "string" } } }, { properties: { name: {} } }],
      },
      tags: { type: "array", items: { type: "string" } },
    },
  });

describe("declaration of the identifier", () => {
  it.each([
    ["id", ["id"]],
    ["identity.id", ["identity", "id"]],
    ["kind.code", ["kind", "code"]],
  ])("reads the field path %s", (written, path) => {
    expect(identifierDeclaration(withIdentifier(written))).toEqual({ status: "declared", path });
    expect(identifierDefects(withIdentifier(written))).toEqual([]);
  });

  it("follows the references of the schema, as for the identity of geonexus", () => {
    const root = SchemaView.root(
      schemaSet({
        "project.schema.yaml": {
          type: "object",
          "x-identifier": "identity.id",
          properties: { identity: { $ref: "common.schema.yaml#/$defs/identity" } },
        },
        "common.schema.yaml": {
          $defs: { identity: { type: "object", properties: { id: { type: "string" } } } },
        },
      }),
    );
    expect(identifierDeclaration(root)).toEqual({ status: "declared", path: ["identity", "id"] });
  });

  it("reports no declaration when the keyword is absent", () => {
    expect(identifierDeclaration(view({ type: "object" }))).toEqual({ status: "absent" });
    expect(identifierDefects(view({ type: "object" }))).toEqual([]);
  });

  it.each([
    [42, "must hold the field path of the identifier, written as a string"],
    ["identity..id", "which is no field path"],
    ["tags[*]", "holds the wildcard path `tags[*]`"],
    ["tags[0]", "names the field `tags[0]`, which the properties of the schema do not declare"],
    ["identity.code", "names the field `identity.code`"],
    ["", "names the field ``"],
  ])("reports %s as a defect of the schema, at its root", (written, reason) => {
    const [defect, ...others] = identifierDefects(withIdentifier(written));
    expect(others).toEqual([]);
    expect(defect?.path).toBe("");
    expect(defect?.message).toContain("The keyword `x-identifier`");
    expect(defect?.message).toContain(reason);
  });
});

describe("value of the identifier", () => {
  const record = { id: "quest.pendulum", identity: { id: "audience-a" }, empty: "", count: 3 };

  it("reads the string at the field path", () => {
    expect(readIdentifier(record, ["id"])).toBe("quest.pendulum");
    expect(readIdentifier(record, ["identity", "id"])).toBe("audience-a");
  });

  it.each([[["missing"]], [["empty"]], [["count"]], [["identity"]], [["id", "deeper"]]])(
    "declares none at %j",
    (path) => {
      expect(readIdentifier(record, path)).toBeNull();
    },
  );

  it("declares none for an instance that is not a mapping", () => {
    expect(readIdentifier(["quest.pendulum"], ["id"])).toBeNull();
    expect(readIdentifier(null, ["id"])).toBeNull();
  });
});
