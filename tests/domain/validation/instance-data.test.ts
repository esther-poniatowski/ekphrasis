import { describe, expect, it } from "vitest";
import {
  ANY_ITEM,
  InstanceData,
  instanceValue,
  parseFieldPath,
  pruneUnfilled,
  UnfilledValues,
} from "../../../src/domain";
import { YamlDocumentParser } from "../../../src/infrastructure";

const parser = new YamlDocumentParser();
const unfilled = new UnfilledValues(["open", [], {}]);

function data(text: string): InstanceData {
  return InstanceData.fromTree(parser.parse(text), unfilled);
}

describe("unfilled values", () => {
  it("counts an absent key, the null value and the declared values, compared by content", () => {
    expect(unfilled.has(undefined)).toBe(true);
    expect(unfilled.has(null)).toBe(true);
    expect(unfilled.has("open")).toBe(true);
    expect(unfilled.has([])).toBe(true);
    expect(unfilled.has({})).toBe(true);
    expect(unfilled.has("")).toBe(false);
    expect(unfilled.has(["open"])).toBe(false);
    expect(unfilled.has(0)).toBe(false);
    expect(new UnfilledValues([]).has("open")).toBe(false);
  });
});

describe("instance value", () => {
  it("follows aliases and expands merge keys", () => {
    const text = "base: &b {x: 1, y: 2}\ncopy: *b\nmerged:\n  <<: *b\n  y: 3\n";
    expect(instanceValue(parser.parse(text))).toEqual({
      base: { x: 1, y: 2 },
      copy: { x: 1, y: 2 },
      merged: { y: 3, x: 1 },
    });
  });

  it("removes the unfilled entries of mappings at every depth, and keeps every item", () => {
    const value = instanceValue(
      parser.parse("a: open\nb: 1\nc: []\nd:\n  e: null\n  f: [open, 2]\ng:\n"),
    );
    expect(pruneUnfilled(value, unfilled)).toEqual({ b: 1, d: { f: ["open", 2] } });
  });
});

describe("paths of rules", () => {
  const instance = data(
    "foils:\n  - {name: decay, symbol: d}\n  - {name: aperiodic}\nmaturity: {a: open, b: stabilized}\n",
  );

  it("reads the values and the filled state of nodes", () => {
    expect(instance.at(["foils", 0, "name"])).toBe("decay");
    expect(instance.at(["foils", 1, "symbol"])).toBeUndefined();
    expect(instance.isFilled(["foils", 0, "symbol"])).toBe(true);
    expect(instance.isFilled(["foils", 1, "symbol"])).toBe(false);
    expect(instance.isFilled(["maturity", "a"])).toBe(false);
  });

  it("expands wildcards over present items and keys, and keeps keys absent from the instance", () => {
    expect(instance.expand([], parseFieldPath("foils[*].symbol"))).toEqual([
      ["foils", 0, "symbol"],
      ["foils", 1, "symbol"],
    ]);
    expect(instance.expand([], parseFieldPath("maturity.*"))).toEqual([
      ["maturity", "a"],
      ["maturity", "b"],
    ]);
    expect(instance.expand(["foils"], [ANY_ITEM, "reading"])).toEqual([
      ["foils", 0, "reading"],
      ["foils", 1, "reading"],
    ]);
    expect(instance.expand([], parseFieldPath("maturity[*]"))).toEqual([]);
  });

  it("binds the wildcards of a shared prefix to the same item in both paths", () => {
    expect(
      instance.pairs([], parseFieldPath("foils[*].symbol"), parseFieldPath("foils[*].name")),
    ).toEqual([
      { subject: ["foils", 0, "symbol"], reference: ["foils", 0, "name"] },
      { subject: ["foils", 1, "symbol"], reference: ["foils", 1, "name"] },
    ]);
    expect(instance.pairs([], parseFieldPath("foils[*].name"), parseFieldPath("status"))).toEqual([
      { subject: ["foils", 0, "name"], reference: ["status"] },
      { subject: ["foils", 1, "name"], reference: ["status"] },
    ]);
  });
});
