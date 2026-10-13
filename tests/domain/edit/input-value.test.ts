import { describe, expect, it } from "vitest";
import { valueFromText } from "../../../src/domain";

describe("value of a control text", () => {
  it("clears the field on the empty text", () => {
    expect(valueFromText("text", "")).toBeNull();
    expect(valueFromText("number", "")).toBeNull();
  });

  it("reads decimal numbers in a field of kind number, and keeps other text as typed", () => {
    expect(valueFromText("number", "42")).toBe(42);
    expect(valueFromText("number", " -1.5e3 ")).toBe(-1500);
    expect(valueFromText("number", ".5")).toBe(0.5);
    expect(valueFromText("number", "open")).toBe("open");
    expect(valueFromText("number", "0x10")).toBe("0x10");
  });

  it("reads true and false in a field of kind boolean", () => {
    expect(valueFromText("boolean", "true")).toBe(true);
    expect(valueFromText("boolean", "false")).toBe(false);
    expect(valueFromText("boolean", "open")).toBe("open");
  });

  it("keeps a number typed in a field of kind text as a string", () => {
    expect(valueFromText("text", "42")).toBe("42");
    expect(valueFromText("label", "true")).toBe("true");
  });
});
