import { describe, expect, it } from "vitest";
import {
  ANY_ITEM,
  ANY_KEY,
  FieldPathError,
  parseFieldPath,
  printFieldPath,
} from "../../../src/domain";

describe("field paths", () => {
  it("prints keys, indices and keys holding a dot", () => {
    expect(printFieldPath(["subject", "foils", 1, "symbol"])).toBe("subject.foils[1].symbol");
    expect(printFieldPath(["maturity", "task.epistemic_aim"])).toBe(
      'maturity["task.epistemic_aim"]',
    );
    expect(printFieldPath([0, "name"])).toBe("[0].name");
    expect(printFieldPath([])).toBe("");
  });

  it("quotes keys that the dotted form cannot hold", () => {
    expect(printFieldPath(["a b", "*", ""])).toBe('["a b"]["*"][""]');
  });

  it.each([
    ["subject.foils[1].symbol"],
    ['maturity["task.epistemic_aim"]'],
    ['["a b"]["*"][""]'],
    ['notes["with \\"quote\\" and ]"]'],
  ])("parses back what it prints: %s", (text) => {
    expect(printFieldPath(parseFieldPath(text) as (string | number)[])).toBe(text);
  });

  it("parses the wildcards of rules", () => {
    expect(parseFieldPath("subject.foils[*].symbol")).toEqual([
      "subject",
      "foils",
      ANY_ITEM,
      "symbol",
    ]);
    expect(parseFieldPath("terms.*.label")).toEqual(["terms", ANY_KEY, "label"]);
  });

  it.each([["a..b"], ["a[1"], ["a[x]"], ["a]b"], ['a["b]']])("rejects %s", (text) => {
    expect(() => parseFieldPath(text)).toThrow(FieldPathError);
  });
});
