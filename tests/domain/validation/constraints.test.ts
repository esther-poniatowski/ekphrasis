import { describe, expect, it } from "vitest";
import { ConstraintIndex } from "../../../src/domain";

describe("index of the constraints", () => {
  const index = new ConstraintIndex([
    { path: ["task", "relation"], effect: "required", condition: "`aim` equals `x`" },
    { path: ["task", "bounds"], effect: "forbidden", condition: "`aim` equals `y`" },
  ]);

  it("marks the fields that a rule requires, by identifier", () => {
    expect(index.requires("task.relation")).toBe(true);
    expect(index.requires("task.bounds")).toBe(false);
    expect(index.requires("task")).toBe(false);
  });

  it("finds the constraint forbidding a field or a group containing it", () => {
    expect(index.forbidding(["task", "bounds"])?.condition).toBe("`aim` equals `y`");
    expect(index.forbidding(["task", "bounds", "lower"])?.condition).toBe("`aim` equals `y`");
    expect(index.forbidding(["task"])).toBeNull();
    expect(index.forbidding(["task", "relation"])).toBeNull();
  });
});
