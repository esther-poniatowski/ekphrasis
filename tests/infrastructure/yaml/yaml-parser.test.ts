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
    expect((error as YamlParseError).position).toEqual({ line: 2, column: 4 });
  });
});
