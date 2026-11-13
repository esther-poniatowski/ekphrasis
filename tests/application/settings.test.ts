import { describe, expect, it } from "vitest";
import {
  completeCustomCheckers,
  DEFAULT_SETTINGS,
  graphPresentationOverrideIssues,
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

  it("keeps a list of excluded path patterns, and else takes the empty default", () => {
    expect(parseSettings({ excludedPaths: ["templates/**"] }).excludedPaths).toEqual([
      "templates/**",
    ]);
    expect(parseSettings({ excludedPaths: ["templates/**", 3] }).excludedPaths).toEqual([]);
    expect(parseSettings({ excludedPaths: "templates/**" }).excludedPaths).toEqual([]);
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

  it("keeps a post-creation command only when every argument is text", () => {
    expect(
      parseSettings({ postCreationCommand: ["-m", "tool", "{path}"] }).postCreationCommand,
    ).toEqual(["-m", "tool", "{path}"]);
    expect(parseSettings({ postCreationCommand: ["-m", 3] }).postCreationCommand).toEqual([]);
    expect(parseSettings({ postCreationCommand: "-m tool" }).postCreationCommand).toEqual([]);
  });

  it("keeps safe partial graph-presentation overrides", () => {
    expect(
      parseSettings({
        graphPresentationOverrides: [
          {
            profile: "sample-workflow",
            version: 1,
            layouts: {
              recommended: "force-directed",
              compatible: ["force-directed", "force-directed", "<script>"],
            },
            categories: {
              artifact: { title: "Local product", marker: "◇", style: "local-product" },
              "<script>": { title: "Unsafe identifier" },
            },
            nodeKinds: {
              question: { icon: "circle-help", style: "local-question" },
            },
            edgeKinds: {
              supports: {
                title: "locally supports",
                layer: "evidence",
                style: "local-edge",
                arrow: "diamond",
                caption: "hide",
              },
            },
          },
        ],
      }).graphPresentationOverrides,
    ).toEqual([
      {
        profile: "sample-workflow",
        version: 1,
        layouts: {
          recommended: "force-directed",
          compatible: ["force-directed"],
        },
        categories: {
          artifact: { title: "Local product", marker: "◇", style: "local-product" },
        },
        nodeKinds: {
          question: { icon: "circle-help", style: "local-question" },
        },
        edgeKinds: {
          supports: {
            title: "locally supports",
            layer: "evidence",
            style: "local-edge",
            arrow: "diamond",
            caption: "hide",
          },
        },
      },
    ]);
  });

  it("drops malformed graph-presentation overrides without affecting other settings", () => {
    expect(
      parseSettings({
        schemaRegistry: "schemas/registry.yml",
        graphPresentationOverrides: [
          { profile: "<script>", version: 1, nodeKinds: { question: { icon: "circle-help" } } },
          "sample-workflow",
        ],
      }),
    ).toMatchObject({
      schemaRegistry: "schemas/registry.yml",
      graphPresentationOverrides: [],
    });
  });

  it("reports every graph-presentation unit that the settings editor would discard", () => {
    expect(
      graphPresentationOverrideIssues([
        { profile: "sample-workflow", version: 1, node_kinds: {} },
        { profile: "sample-workflow", version: 2 },
        { profile: "<script>", version: 0 },
      ]),
    ).toEqual([
      "Entry 1.node_kinds is not recognized.",
      "Entry 2.profile duplicates sample-workflow.",
      "Entry 3.profile must be a safe identifier.",
      "Entry 3.version must be a positive integer.",
    ]);
  });

  it("rejects unregistered edge recipes while retaining valid edge properties", () => {
    const raw = [
      {
        profile: "sample-workflow",
        version: 1,
        edgeKinds: { supports: { style: "evidence", arrow: "fork", caption: "sometimes" } },
      },
    ];

    expect(graphPresentationOverrideIssues(raw)).toEqual([
      "Entry 1.edgeKinds.supports.arrow is not a registered recipe.",
      "Entry 1.edgeKinds.supports.caption is not a registered recipe.",
    ]);
    expect(parseSettings({ graphPresentationOverrides: raw }).graphPresentationOverrides).toEqual([
      {
        profile: "sample-workflow",
        version: 1,
        categories: {},
        nodeKinds: {},
        edgeKinds: { supports: { style: "evidence" } },
      },
    ]);
  });

  it("keeps only the first versioned override for one profile", () => {
    expect(
      parseSettings({
        graphPresentationOverrides: [
          { profile: "sample-workflow", version: 1 },
          { profile: "sample-workflow", version: 2 },
        ],
      }).graphPresentationOverrides,
    ).toEqual([
      {
        profile: "sample-workflow",
        version: 1,
        categories: {},
        nodeKinds: {},
        edgeKinds: {},
      },
    ]);
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
