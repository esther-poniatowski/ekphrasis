import { describe, expect, it } from "vitest";
import { YamlParseError } from "../../../src/errors";
import { YamlDocumentParser } from "../../../src/infrastructure";

describe("YamlDocumentParser", () => {
  const parser = new YamlDocumentParser();

  it("preserves key order, scalar styles and source ranges", () => {
    const root = parser.parse("prose: |\n  Text with $x$.\ncount: 3\n");

    expect(root.kind).toBe("mapping");
    if (root.kind !== "mapping") return;
    expect(root.entries.map((entry) => entry.key)).toEqual(["prose", "count"]);
    expect(root.entries[0]?.value).toMatchObject({
      kind: "scalar",
      style: "literal",
      value: "Text with $x$.\n",
    });
    expect(root.entries[1]?.value.range).not.toBeNull();
  });

  it("resolves an alias to the node of its anchor, and keeps the range of the alias", () => {
    const text = "nominal: &g 9.81\ncase: *g\n";
    const root = parser.parse(text);
    if (root.kind !== "mapping") throw new Error("expected a mapping");
    const alias = root.entries[1]?.value;
    expect(alias).toMatchObject({
      kind: "alias",
      name: "g",
      target: { kind: "scalar", value: 9.81 },
    });
    expect(alias?.range && text.slice(alias.range.start, alias.range.end)).toBe("*g");
  });

  it("stops at an alias to one of its ancestors", () => {
    const root = parser.parse("loop: &l [*l]\n");
    if (root.kind !== "mapping") throw new Error("expected a mapping");
    expect(root.entries[0]?.value).toMatchObject({
      kind: "sequence",
      items: [{ kind: "alias", name: "l", target: null }],
    });
  });

  it("reports the range of each key, and whether each collection is written in flow style", () => {
    const text = "block:\n  - a\nflow: {k: [1]}\nbare:\n";
    const root = parser.parse(text);
    if (root.kind !== "mapping") throw new Error("expected a mapping");
    const [block, flow, bare] = root.entries;
    expect(root.flow).toBe(false);
    expect(block?.keyRange && text.slice(block.keyRange.start, block.keyRange.end)).toBe("block");
    expect(block?.value).toMatchObject({ kind: "sequence", flow: false });
    expect(flow?.value).toMatchObject({
      kind: "mapping",
      flow: true,
      entries: [{ key: "k", value: { kind: "sequence", flow: true } }],
    });
    // An empty value has an empty range, placed after the colon of its key.
    const afterColon = text.indexOf("bare:") + "bare:".length;
    expect(bare?.value).toMatchObject({
      kind: "scalar",
      value: null,
      range: { start: afterColon, end: afterColon },
    });
  });

  it("places the error of an unclosed bracket at the bracket, not where the parser detects it", () => {
    const positionOf = (text: string): unknown => {
      try {
        parser.parse(text);
      } catch (error) {
        return error instanceof YamlParseError ? error.position : error;
      }
      return null;
    };
    expect(positionOf("title: x\ndraft: [false\nstatus: posed # c\n")).toEqual({
      line: 2,
      column: 8,
      lineText: "draft: [false",
    });
    expect(positionOf("a: {b: [1, 2}\nc: 3\n")).toMatchObject({ line: 1, column: 8 });
  });

  it("raises a positioned YamlParseError on invalid input", () => {
    expect(() => parser.parse("key: [1, 2\n")).toThrow(YamlParseError);
    const error = ((): unknown => {
      try {
        parser.parse("a: 1\nb: c: d\n");
        return null;
      } catch (thrown) {
        return thrown;
      }
    })();
    expect(error).toBeInstanceOf(YamlParseError);
    expect(error).toMatchObject({
      message: expect.not.stringMatching(/line|\n/) as unknown,
      position: { line: 2, column: 4, lineText: "b: c: d" },
    });
  });
});
