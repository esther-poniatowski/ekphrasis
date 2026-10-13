import { describe, expect, it } from "vitest";
import { canRepresent, isPlainSafe, selectScalarStyle } from "../../../src/domain";

describe("plain scalars", () => {
  it.each(["open", "damped pendulum", "a, b", "x-1", "-1a", "SET EXPRESSION", "a#b", "a:b"])(
    "admits %j in a block mapping",
    (text) => {
      expect(isPlainSafe(text, "after-key")).toBe(true);
    },
  );

  it.each([
    ["the empty text", ""],
    ["a leading space", " a"],
    ["a trailing space", "a "],
    ["a line break", "a\nb"],
    ["a flow opener", "[a]"],
    ["a brace", "{a}"],
    ["a comment", "a #b"],
    ["a leading hash", "#a"],
    ["a key separator", "a: b"],
    ["a final colon", "a:"],
    ["an alias", "*a"],
    ["an anchor", "&a"],
    ["a tag", "!a"],
    ["a block indicator", "|a"],
    ["a folded indicator", ">a"],
    ["a quote", "'a'"],
    ["a double quote", '"a"'],
    ["a backtick", "`a`"],
    ["an at sign", "@a"],
    ["a sequence indicator", "- a"],
    ["a document marker", "---"],
    ["the null value", "null"],
    ["a tilde", "~"],
    ["a boolean", "true"],
    ["a YAML 1.1 boolean", "yes"],
    ["a YAML 1.1 switch", "Off"],
    ["an integer", "42"],
    ["a signed decimal", "-0.5"],
    ["an exponent", "1e3"],
    ["an octal", "0o17"],
    ["a YAML 1.1 octal", "017"],
    ["a hexadecimal", "0x1F"],
    ["a sexagesimal", "1:30"],
    ["an infinity", "-.inf"],
    ["a date", "2026-10-03"],
    ["a merge key", "<<"],
  ])("refuses %s", (_, text) => {
    expect(isPlainSafe(text, "after-key")).toBe(false);
  });

  it("refuses the flow indicators inside a flow collection only", () => {
    expect(isPlainSafe("a, b", "after-key")).toBe(true);
    expect(isPlainSafe("a, b", "flow")).toBe(false);
    expect(isPlainSafe("a]", "flow")).toBe(false);
  });
});

describe("representable styles", () => {
  it("admits any line in a double-quoted scalar, and no line break", () => {
    expect(canRepresent("double-quoted", "b: c # \\ \u0007", "flow")).toBe(true);
    expect(canRepresent("double-quoted", "a\nb", "after-key")).toBe(false);
  });

  it("admits single lines in a single-quoted scalar", () => {
    expect(canRepresent("single-quoted", "it's \\alpha", "after-key")).toBe(true);
    expect(canRepresent("single-quoted", "a\nb", "after-key")).toBe(false);
  });

  it("admits block scalars outside flow collections, except texts the writer quotes", () => {
    expect(canRepresent("literal", "one line", "after-key")).toBe(true);
    expect(canRepresent("folded", "a\nb\n", "block")).toBe(true);
    expect(canRepresent("literal", "a\nb", "flow")).toBe(false);
    expect(canRepresent("literal", "   ", "after-key")).toBe(false);
    expect(canRepresent("literal", "a\n  ", "after-key")).toBe(false);
  });
});

describe("selected style", () => {
  it("writes numbers and booleans plain, whatever the current style", () => {
    expect(selectScalarStyle(42, "after-key", "double-quoted")).toBe("plain");
    expect(selectScalarStyle(false, "flow", "single-quoted")).toBe("plain");
  });

  it("keeps the current style when it represents the value", () => {
    expect(selectScalarStyle("text", "after-key", "double-quoted")).toBe("double-quoted");
    expect(selectScalarStyle("one line", "after-key", "literal")).toBe("literal");
    expect(selectScalarStyle("a: b", "after-key", "single-quoted")).toBe("single-quoted");
  });

  it("selects by content when the current style cannot represent the value", () => {
    expect(selectScalarStyle("a\nb\n", "after-key", "plain")).toBe("literal");
    expect(selectScalarStyle("a\n\nb\n", "after-key", "double-quoted")).toBe("literal");
    expect(selectScalarStyle("a: b", "after-key", "plain")).toBe("single-quoted");
    expect(selectScalarStyle("42", "after-key", "plain")).toBe("single-quoted");
  });

  it("selects by content for a new value, following the table of the saving note", () => {
    expect(selectScalarStyle("first\nsecond\n", "after-key", null)).toBe("literal");
    expect(selectScalarStyle("\\alpha + x", "after-key", null)).toBe("single-quoted");
    expect(selectScalarStyle("a, b", "after-key", null)).toBe("plain");
    expect(selectScalarStyle("a, b", "flow", null)).toBe("single-quoted");
    expect(selectScalarStyle("true", "after-key", null)).toBe("single-quoted");
    expect(selectScalarStyle("[a]", "after-key", null)).toBe("single-quoted");
  });

  it("writes a line break inside a flow collection double-quoted", () => {
    expect(selectScalarStyle("a\nb", "flow", null)).toBe("double-quoted");
  });
});
