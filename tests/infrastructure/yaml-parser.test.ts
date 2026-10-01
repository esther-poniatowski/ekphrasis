import { describe, expect, it } from "vitest";
import { YamlParseError } from "../../src/errors";
import { YamlDocumentParser } from "../../src/infrastructure";

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

  it("raises a positioned YamlParseError on invalid input", () => {
    expect(() => parser.parse("key: [1, 2\n")).toThrow(YamlParseError);
  });
});
