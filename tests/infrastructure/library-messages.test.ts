import { describe, expect, it } from "vitest";
import { nameBareSymbols } from "../../src/infrastructure/library-messages";

describe("bare symbols in library messages", () => {
  it.each([
    ["must end with a ]", "must end with a `]` symbol"],
    [
      "Missing , or : between flow map items",
      "Missing `,` symbol or `:` symbol between flow map items",
    ],
    ["Unexpected } in flow sequence", "Unexpected `}` symbol in flow sequence"],
    ["] at the start", "`]` symbol at the start"],
  ])("names the symbol in %j", (message, expected) => {
    expect(nameBareSymbols(message)).toBe(expected);
  });

  it("leaves symbols inside words and code spans unchanged", () => {
    const message = "Nested mappings are not allowed in compact mappings; see `a: b` and x-kind";
    expect(nameBareSymbols(message)).toBe(message);
  });
});
