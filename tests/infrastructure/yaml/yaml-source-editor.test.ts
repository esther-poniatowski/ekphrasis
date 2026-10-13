import { describe, expect, it } from "vitest";
import { scalarPart, splice, type ScalarText } from "../../../src/domain";
import { SourceEditError } from "../../../src/errors";
import { YamlSourceEditor } from "../../../src/infrastructure";

const editor = new YamlSourceEditor();

const literal: ScalarText = { text: "a\nb\n", style: "literal", context: "after-key", indent: 0 };

describe("YamlSourceEditor", () => {
  it("rewrites the token at an offset in the given style and context", () => {
    const scalar: ScalarText = { text: "x, y", style: "single-quoted", context: "flow", indent: 0 };
    expect(editor.apply("k: {a: b} # c\n", [{ kind: "rewrite", offset: 7, scalar }])).toBe(
      "k: {a: 'x, y'} # c\n",
    );
  });

  it("writes the header and the body of a new block scalar, indented under its key", () => {
    const text = "k:";
    expect(
      editor.apply(text, [
        splice(2, 2, [" ", scalarPart(literal, "header")]),
        splice(2, 2, ["\n", scalarPart(literal, "body")]),
      ]),
    ).toBe("k: |\n  a\n  b\n");
  });

  it("refuses overlapping edits and a rewrite without a token", () => {
    expect(() => editor.apply("k: v\n", [splice(0, 3, []), splice(2, 4, [])])).toThrow(
      SourceEditError,
    );
    expect(() => editor.apply("k: v\n", [{ kind: "rewrite", offset: 1, scalar: literal }])).toThrow(
      SourceEditError,
    );
  });
});
