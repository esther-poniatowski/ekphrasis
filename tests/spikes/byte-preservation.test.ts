/**
 * Spike on byte preservation: an edit through the concrete syntax tree of the `yaml` library
 * changes no byte outside the edited token, on every scalar of every fixture.
 *
 * Verdict recorded in the decision record on source-preserving writes.
 */
import { describe, expect, it } from "vitest";
import { FIXTURES_ROOT, readYamlFiles } from "../support/yaml-files";
import {
  changeStyle,
  editScalar,
  failingEdits,
  keepStyle,
  reportEdit,
  tokenlessScalars,
} from "./scalar-edit";

const fixtures = readYamlFiles(FIXTURES_ROOT);

describe("byte preservation of scalar edits", () => {
  it("finds the fixtures", () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  describe.each(fixtures)("$name", ({ text }) => {
    it("preserves every byte outside the token when the style is kept", () => {
      expect(failingEdits(text, keepStyle)).toEqual([]);
    });

    it("preserves every byte outside the token when the style changes", () => {
      expect(failingEdits(text, changeStyle)).toEqual([]);
    });
  });

  it("leaves an empty value without a token, so writing it is an insertion", () => {
    const text = "filled: value\nempty:\n";

    expect(tokenlessScalars(text)).toBe(1);
  });

  it("detects a byte changed outside the edited token", () => {
    const text = "first: one # kept\nsecond: two\n";
    const edit = { value: "edited" };
    const result = editScalar(text, 1, edit);
    const tampered = { ...result, text: result.text.replace("second", "Second") };

    expect(reportEdit(text, 1, edit, result).untouchedOutsideToken).toBe(true);
    expect(reportEdit(text, 1, edit, tampered).untouchedOutsideToken).toBe(false);
  });

  it("detects an edit that introduces a parse error", () => {
    const text = "first: one\nsecond: two\n";
    const edit = { value: "edited" };
    const result = editScalar(text, 1, edit);
    const broken = { ...result, text: result.text.replace("edited", "[edited") };

    expect(reportEdit(text, 1, edit, result).addsNoParseError).toBe(true);
    expect(reportEdit(text, 1, edit, broken).addsNoParseError).toBe(false);
  });
});
