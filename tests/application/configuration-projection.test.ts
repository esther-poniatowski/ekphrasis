/**
 * The projection of the configuration published by `packages/configuration`, read back by the
 * settings parser of the plugin: every projected setting survives the parser unchanged, so that a
 * renamed setting fails here instead of falling back to its default without a warning.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { SETTINGS_KEYS, projectConfiguration } from "../../packages/configuration/src/projection";
import { DEFAULT_SETTINGS, parseSettings } from "../../src/application/settings";

interface Case {
  readonly name: string;
  readonly document: Record<string, unknown>;
  readonly valid: boolean;
  readonly root?: string;
}

const cases = (
  parse(readFileSync(new URL("../../specs/cases/configuration.yml", import.meta.url), "utf8")) as {
    cases: Case[];
  }
).cases.filter((item) => item.valid);

describe("the projection of the configuration", () => {
  it("projects onto settings that the plugin declares", () => {
    for (const setting of Object.values(SETTINGS_KEYS)) {
      expect(Object.keys(DEFAULT_SETTINGS)).toContain(setting);
    }
  });

  it.each(cases)("keeps every setting of the case $name through the settings parser", (item) => {
    const projected = projectConfiguration(item.document, item.root ?? "");
    const parsed = parseSettings(projected) as unknown as Record<string, unknown>;
    for (const [setting, value] of Object.entries(projected)) {
      expect(parsed[setting]).toEqual(value);
    }
  });
});
