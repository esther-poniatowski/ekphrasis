import { describe, expect, it } from "vitest";
import {
  completeCustomCheckers,
  DEFAULT_SETTINGS,
  parseSettings,
  resolveCustomCheckerModules,
} from "../../src/application";

describe("settings", () => {
  it("keeps a schema registry path", () => {
    expect(parseSettings({ schemaRegistry: "specs/schema-registry.yml" }).schemaRegistry).toBe(
      "specs/schema-registry.yml",
    );
  });

  it("ignores the removed schema resource directory", () => {
    expect(parseSettings({ schemaResourceRoot: ".schema-resources" })).toEqual(DEFAULT_SETTINGS);
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

  it("keeps a custom-checker timeout within the limits, and else takes the default", () => {
    expect(parseSettings({ customCheckerTimeout: 5000 }).customCheckerTimeout).toBe(5000);
    expect(parseSettings({ customCheckerTimeout: 99 }).customCheckerTimeout).toBe(
      DEFAULT_SETTINGS.customCheckerTimeout,
    );
    expect(parseSettings({ customCheckerTimeout: 120_001 }).customCheckerTimeout).toBe(
      DEFAULT_SETTINGS.customCheckerTimeout,
    );
    expect(parseSettings({ customCheckerTimeout: "5000" }).customCheckerTimeout).toBe(
      DEFAULT_SETTINGS.customCheckerTimeout,
    );
  });

  it("keeps the Python interpreter and well-formed checker registrations", () => {
    const raw = {
      pythonInterpreter: "/opt/conda/envs/research/bin/python",
      customCheckers: [
        { name: "declared-symbols", module: "project.checks", function: "declared_symbols" },
        { name: "broken", module: 3, function: "check" },
        { name: "local", module: "/vault/checks.py", function: "local_check" },
      ],
    };

    expect(parseSettings(raw)).toMatchObject({
      pythonInterpreter: "/opt/conda/envs/research/bin/python",
      customCheckers: [
        { name: "declared-symbols", module: "project.checks", function: "declared_symbols" },
        { name: "local", module: "/vault/checks.py", function: "local_check" },
      ],
    });
  });

  it("keeps the schema patterns and the arguments of an instance checker when well formed", () => {
    const base = { name: "tool", module: "ekphrasis_findings", function: "findings_log" };
    const raw = {
      customCheckers: [
        { ...base, schemas: ["tool:*", " "], arguments: { command: ["-m", "tool"] } },
        { ...base, schemas: "tool:*", arguments: ["-m", "tool"] },
      ],
    };

    expect(parseSettings(raw).customCheckers).toEqual([
      { ...base, schemas: ["tool:*"], arguments: { command: ["-m", "tool"] } },
      base,
    ]);
  });

  it("takes empty custom-checker defaults when their stored values are malformed", () => {
    expect(
      parseSettings({ pythonInterpreter: 3, customCheckers: [{ name: "check" }] }),
    ).toMatchObject({ pythonInterpreter: "", customCheckers: [] });
  });

  it("keeps a primary-view command only when every argument is text", () => {
    expect(
      parseSettings({ primaryViewCommand: ["-m", "tool", "{target}"] }).primaryViewCommand,
    ).toEqual(["-m", "tool", "{target}"]);
    expect(parseSettings({ primaryViewCommand: ["-m", 3] }).primaryViewCommand).toEqual([]);
    expect(parseSettings({ primaryViewCommand: "-m tool" }).primaryViewCommand).toEqual([]);
  });

  it("supplies only complete checker registrations to the process", () => {
    expect(
      completeCustomCheckers([
        { name: "declared-symbols", module: "project.checks", function: "check" },
        { name: "", module: "project.checks", function: "check" },
        { name: "local", module: "  ", function: "check" },
      ]),
    ).toEqual([{ name: "declared-symbols", module: "project.checks", function: "check" }]);
  });

  it("resolves checker files from the vault and keeps importable modules", () => {
    expect(
      resolveCustomCheckerModules(
        [
          { name: "local", module: "checks/project.py", function: "check" },
          { name: "installed", module: "project.checks", function: "check" },
        ],
        (path) => `/vault/${path}`,
      ),
    ).toEqual([
      { name: "local", module: "/vault/checks/project.py", function: "check" },
      { name: "installed", module: "project.checks", function: "check" },
    ]);
  });

  it.each([[null], [undefined], ["text"], [{ pathRules: "x", commitDelay: 1e9 }]])(
    "falls back to the defaults for %s",
    (raw) => {
      expect(parseSettings(raw)).toEqual(DEFAULT_SETTINGS);
    },
  );
});
