import { describe, expect, it } from "vitest";
import {
  issuesFromValidatorErrors,
  pathOfPointer,
  type JsonObject,
  type ValidatorError,
} from "../../../src/domain";

function error(
  pointer: string,
  keyword: string,
  params: JsonObject = {},
  propertyName: string | null = null,
): ValidatorError {
  return { pointer, keyword, params, message: `fails ${keyword}`, propertyName };
}

describe("field paths of validator errors", () => {
  it("types the segments of a pointer by the instance", () => {
    const instance = { terms: { "0": { tags: ["a", "b"] } }, "a/b": { "~c": 1 } };
    expect(pathOfPointer("/terms/0/tags/1", instance)).toEqual(["terms", "0", "tags", 1]);
    expect(pathOfPointer("/a~1b/~0c", instance)).toEqual(["a/b", "~c"]);
    expect(pathOfPointer("", instance)).toEqual([]);
  });

  it("locates a missing required key at the key itself, as a missing field", () => {
    const [issue] = issuesFromValidatorErrors(
      [error("/task", "required", { missingProperty: "requested_relation" })],
      { task: {} },
    );
    expect(issue).toMatchObject({
      id: "task.requested_relation",
      path: ["task", "requested_relation"],
      checker: "required",
      missing: true,
      severity: "error",
    });
  });

  it("locates the keys outside the schema and the keys rejected by their name schema", () => {
    const issues = issuesFromValidatorErrors(
      [
        error("", "additionalProperties", { additionalProperty: "extra" }),
        error("/terms", "pattern", { pattern: "^[a-z]+$" }, "Bad1"),
        error("/terms", "propertyNames", { propertyName: "Bad1" }, "Bad1"),
      ],
      { extra: 1, terms: { Bad1: 1 } },
    );
    expect(issues.map(({ id, checker, missing }) => [id, checker, missing])).toEqual([
      ["extra", "additionalProperties", false],
      ["terms.Bad1", "propertyNames", false],
    ]);
  });

  it("drops the error of `if`, which repeats the errors of its `then`", () => {
    const issues = issuesFromValidatorErrors(
      [
        error("/task", "required", { missingProperty: "rel" }),
        error("/task", "if", { failingKeyword: "then" }),
      ],
      { task: { aim: "a" } },
    );
    expect(issues.map(({ id }) => id)).toEqual(["task.rel"]);
  });
});

describe("merging of alternatives", () => {
  it("merges the errors of a `oneOf` of constants into one issue listing the admitted values", () => {
    const issues = issuesFromValidatorErrors(
      [
        error("/category", "const", { allowedValue: "noun" }),
        error("/category", "const", { allowedValue: "verb" }),
        error("/category", "const", { allowedValue: "adjective" }),
        error("/category", "oneOf", { passingSchemas: null }),
      ],
      { category: "{{CATEGORY}}" },
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      id: "category",
      checker: "oneOf",
      message: "The value must be one of: `noun`, `verb`, `adjective`.",
    });
  });

  it("merges the missing keys of failing alternatives, and keeps the errors of sibling keywords", () => {
    const issues = issuesFromValidatorErrors(
      [
        error("/confusions/0", "required", { missingProperty: "term" }),
        error("/confusions/0", "required", { missingProperty: "undeclared" }),
        error("/confusions/0", "oneOf", { passingSchemas: null }),
        error("/confusions/0/distinction", "pattern", { pattern: "^x" }),
      ],
      { confusions: [{ distinction: "y" }] },
    );
    expect(issues.map(({ id, checker, message }) => [id, checker, message])).toEqual([
      ["confusions[0]", "oneOf", "The value matches none of the admitted alternatives."],
      ["confusions[0].distinction", "pattern", "The text must match the pattern `^x`."],
    ]);
  });

  it("absorbs the errors of the alternatives below the path of the `oneOf`, and no earlier error", () => {
    const issues = issuesFromValidatorErrors(
      [
        error("/other", "type", { type: "string" }),
        error("/alt/p", "type", { type: "number" }),
        error("/alt", "type", { type: "string" }),
        error("/alt", "oneOf", { passingSchemas: [0, 1] }),
      ],
      { other: 1, alt: { p: "x" } },
    );
    expect(issues.map(({ id, message }) => [id, message])).toEqual([
      ["other", "The value must be of type `string`."],
      ["alt", "The value matches several alternatives, whereas exactly one is admitted."],
    ]);
  });

  it("reports an issue repeated by two schemas once", () => {
    const issues = issuesFromValidatorErrors(
      [
        error("", "required", { missingProperty: "id" }),
        error("", "required", { missingProperty: "id" }),
      ],
      {},
    );
    expect(issues).toHaveLength(1);
  });
});

describe("messages", () => {
  it.each([
    ["type", { type: "string,null" }, "The value must be of type `string` or `null`."],
    ["enum", { allowedValues: ["a", 1] }, "The value must be one of: `a`, `1`."],
    ["minimum", { comparison: ">=", limit: 3 }, "The value must be at least 3."],
    ["maxItems", { limit: 2 }, "The sequence must hold at most 2 items."],
    ["uniqueItems", { i: 2, j: 0 }, "Items #1 and #3 are identical."],
    [
      "dependentRequired",
      { property: "a", missingProperty: "b" },
      "This field is required when `a` is present.",
    ],
    ["contains", {}, "The value fails the keyword `contains` of the schema: fails contains."],
  ] as const)("phrases the keyword %s", (keyword, params, message) => {
    const [issue] = issuesFromValidatorErrors([error("/v", keyword, params)], { v: 1 });
    expect(issue?.message).toBe(message);
  });
});
