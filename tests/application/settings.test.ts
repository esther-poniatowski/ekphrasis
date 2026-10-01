import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "../../src/application";

describe("settings", () => {
  it("keeps the well-formed path rules in their order", () => {
    const raw = {
      pathRules: [
        { pattern: "a/*.yml", schema: "a.schema.yaml" },
        { pattern: 3, schema: "x" },
        "rule",
        { pattern: "", schema: "" },
      ],
    };
    expect(parseSettings(raw).pathRules).toEqual([
      { pattern: "a/*.yml", schema: "a.schema.yaml" },
      { pattern: "", schema: "" },
    ]);
  });

  it.each([[null], [undefined], ["text"], [{ pathRules: "x" }]])(
    "falls back to the defaults for %s",
    (raw) => {
      expect(parseSettings(raw)).toEqual(DEFAULT_SETTINGS);
    },
  );
});
