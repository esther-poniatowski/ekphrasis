/** The cases of the configuration, run against its schema and its projection. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  CONFIGURATION_SCHEMA_ID,
  ConfigurationError,
  configurationIssues,
  projectConfiguration,
} from "../src/index.js";

interface Case {
  readonly name: string;
  readonly document: Record<string, unknown>;
  readonly valid: boolean;
  readonly root?: string;
  readonly settings?: Record<string, unknown>;
}

const cases = (
  parse(
    readFileSync(new URL("../../../specs/cases/configuration.yml", import.meta.url), "utf8"),
  ) as { cases: Case[] }
).cases;

describe.each(cases)("the case $name", (item) => {
  it("receives the verdict of the case", () => {
    expect(configurationIssues(item.document).length === 0).toBe(item.valid);
  });

  it.runIf(item.settings !== undefined)("projects onto the settings of the case", () => {
    expect(projectConfiguration(item.document, item.root ?? "")).toEqual(item.settings);
  });
});

describe("the configuration", () => {
  it("is published under its absolute $id", () => {
    expect(CONFIGURATION_SCHEMA_ID).toBe(
      "https://github.com/esther-poniatowski/ekphrasis/specs/schemas/configuration.schema.json",
    );
  });

  it.each(["../outside", "/absolute"])("refuses the root %s outside the vault", (root) => {
    expect(() => projectConfiguration({}, root)).toThrow(ConfigurationError);
  });
});
