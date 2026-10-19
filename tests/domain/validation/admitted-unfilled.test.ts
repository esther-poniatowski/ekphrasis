import { describe, expect, it } from "vitest";
import { admittedUnfilledValues } from "../../../src/domain";
import { view } from "../../support/schemas";

describe("unfilled values admitted by a field", () => {
  it("reports each field that enumerates a value of `x-unfilled`", () => {
    const issues = admittedUnfilledValues(
      view({
        type: "object",
        "x-unfilled": ["open", []],
        properties: {
          status: { enum: ["posed", "open"] },
          aim: { oneOf: [{ const: "open", title: "Open" }, { const: "closed" }] },
          fixed: { const: "open" },
          text: { type: "string" },
          list: { type: "array", items: { enum: ["a", "open"] } },
        },
      }),
    );
    expect(issues.map(({ path }) => path)).toEqual(["status", "aim", "fixed", "list[*]"]);
    expect(issues[0]?.message).toBe(
      "The value `open` is declared unfilled by the keyword `x-unfilled`, but also admitted by this field, so the form displays it as an empty value.",
    );
  });

  it("reports nothing when the schema declares no unfilled value", () => {
    expect(
      admittedUnfilledValues(view({ type: "object", properties: { s: { enum: ["open"] } } })),
    ).toEqual([]);
  });
});
