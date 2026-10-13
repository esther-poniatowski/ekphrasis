import { describe, expect, it } from "vitest";
import { expectedTree, sameContent, type YamlNode } from "../../../src/domain";
import { YamlDocumentParser } from "../../../src/infrastructure";

const parser = new YamlDocumentParser();
const parse = (text: string): YamlNode => parser.parse(text);

describe("expected tree of a commit", () => {
  const tree = parse("a: 1\nb:\n  c: x\nlist: [p, q]\n");

  it("sets a value, and leaves every other value as it is", () => {
    const expected = expectedTree(tree, ["b", "c"], { kind: "set", value: "y" });
    expect(sameContent(expected, parse("list: [p, q]\na: 1\nb: {c: y}\n"))).toBe(true);
  });

  it("removes a key", () => {
    const expected = expectedTree(tree, ["a"], { kind: "remove" });
    expect(sameContent(expected, parse("b:\n  c: x\nlist: [p, q]\n"))).toBe(true);
  });

  it("adds the absent keys of a path, and turns a null value along the path into a mapping", () => {
    const absent = expectedTree(tree, ["d", "e"], { kind: "set", value: 2 });
    expect(sameContent(absent, parse("a: 1\nb:\n  c: x\nlist: [p, q]\nd:\n  e: 2\n"))).toBe(true);
    const empty = expectedTree(parse("a:\n"), ["a", "b"], { kind: "set", value: true });
    expect(sameContent(empty, parse("a:\n  b: true\n"))).toBe(true);
  });

  it("sets an item of a sequence", () => {
    const expected = expectedTree(tree, ["list", 1], { kind: "set", value: "r" });
    expect(sameContent(expected, parse("a: 1\nb: {c: x}\nlist: [p, r]\n"))).toBe(true);
  });
});

describe("comparison by content", () => {
  it("ignores styles, ranges and the order of keys", () => {
    expect(sameContent(parse("a: 'x'\nb: 1\n"), parse('b: 1\na: "x"\n'))).toBe(true);
  });

  it("distinguishes a number from a string, and the order of items", () => {
    expect(sameContent(parse("a: 1\n"), parse("a: '1'\n"))).toBe(false);
    expect(sameContent(parse("[1, 2]\n"), parse("[2, 1]\n"))).toBe(false);
  });

  it("compares aliases by the name of their anchor", () => {
    expect(sameContent(parse("a: &x 1\nb: *x\n"), parse("a: &x 2\nb: *x\n"))).toBe(false);
    const edited = expectedTree(parse("a: &x 1\nb: *x\n"), ["a"], { kind: "set", value: 2 });
    expect(sameContent(edited, parse("a: &x 2\nb: *x\n"))).toBe(true);
  });
});
