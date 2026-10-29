import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "../../src/application";

describe("settings", () => {
  it("keeps a schema registry path", () => {
    expect(parseSettings({ schemaRegistry: "specs/schema-registry.yml" }).schemaRegistry).toBe(
      "specs/schema-registry.yml",
    );
  });

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

  it("keeps a commit delay within the limits, and else takes the default", () => {
    expect(parseSettings({ commitDelay: 2000 }).commitDelay).toBe(2000);
    expect(parseSettings({ commitDelay: 10 }).commitDelay).toBe(DEFAULT_SETTINGS.commitDelay);
    expect(parseSettings({ commitDelay: "2000" }).commitDelay).toBe(DEFAULT_SETTINGS.commitDelay);
  });

  it.each([[null], [undefined], ["text"], [{ pathRules: "x", commitDelay: 1e9 }]])(
    "falls back to the defaults for %s",
    (raw) => {
      expect(parseSettings(raw)).toEqual(DEFAULT_SETTINGS);
    },
  );
});
