import { describe, expect, it } from "vitest";
import {
  buildFormModel,
  InstanceData,
  isJsonPointer,
  locateFinding,
  UnfilledValues,
  type JsonValue,
} from "../../../src/domain";
import { YamlDocumentParser } from "../../../src/infrastructure";
import { schemaSet } from "../../support/schemas";

const SCHEMA: JsonValue = {
  type: "object",
  properties: {
    title: { type: "string" },
    laws: {
      type: "array",
      items: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          kind: { type: "string" },
          expression: { type: "string" },
          reading: { type: "string" },
          requires: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

const TEXT = [
  "title: Relaxation",
  "laws:",
  "  - symbol: f",
  "    kind: law",
  "    expression: x = y",
  "    requires: [a, b]",
  "  - symbol: g",
  "    kind: law",
  "    expression: u = zz",
  "",
].join("\n");

/** Field path of the finding at `pointer` and `discriminator` in the instance above. */
function locate(pointer: string, discriminator = ""): readonly (string | number)[] {
  const tree = new YamlDocumentParser().parse(TEXT);
  const model = buildFormModel(schemaSet({ "s.json": SCHEMA }), tree, TEXT);
  const data = InstanceData.fromTree(tree, new UnfilledValues(model.unfilled));
  return locateFinding(model.root, data.value, pointer, discriminator);
}

describe("location of a finding", () => {
  it("follows a JSON Pointer through keys and indices", () => {
    expect(locate("/title")).toEqual(["title"]);
    expect(locate("/laws/0/expression")).toEqual(["laws", 0, "expression"]);
    expect(locate("")).toEqual([]);
  });

  it("enters the entry that the discriminator names, then the field below it", () => {
    expect(locate("/laws", "g/expression/zz")).toEqual(["laws", 1, "expression"]);
    expect(locate("/laws", "f/requires/1")).toEqual(["laws", 0, "requires", 1]);
  });

  it("reaches a declared field that the entry leaves absent", () => {
    expect(locate("/laws", "g/reading")).toEqual(["laws", 1, "reading"]);
  });

  it("stops at the first part that names neither a declared field nor a node", () => {
    expect(locate("/laws", "f/unknown/expression")).toEqual(["laws", 0]);
  });

  it("keeps a declared field when later offending content has a field name", () => {
    expect(locate("/laws", "g/expression/reading")).toEqual(["laws", 1, "expression"]);
  });

  it("keeps the list when no single entry holds the identifier", () => {
    expect(locate("/laws", "law/expression")).toEqual(["laws"]);
    expect(locate("/laws", "a -> b -> a")).toEqual(["laws"]);
  });

  it("keeps a pointer to an undeclared node, which designates no field", () => {
    expect(locate("/nothing/below")).toEqual(["nothing", "below"]);
  });

  it("recognizes a JSON Pointer", () => {
    expect([isJsonPointer(""), isJsonPointer("/a~1b"), isJsonPointer("/a~0")]).toEqual([
      true,
      true,
      true,
    ]);
    expect([isJsonPointer("link:target"), isJsonPointer("/a~2")]).toEqual([false, false]);
  });
});
