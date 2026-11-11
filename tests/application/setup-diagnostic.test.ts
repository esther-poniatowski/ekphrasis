/**
 * Tests of the setup diagnostic: each broken dependency of the route from the schema registry to
 * an issue at its field yields a check that does not pass, in the group of the capability that it
 * removes, with the action that repairs it. The vault is in memory, the form state of the record
 * comes from the form pipeline, and the Python probe answers from a script.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  FINDINGS_LOG_CHECKER,
  FormService,
  RegistryReader,
  reportText,
  runSetupDiagnostic,
  statusCounts,
  type CommandReport,
  type CustomCheckerRegistration,
  type DiagnosticCheck,
  type DiagnosticReport,
  type EkphrasisSettings,
  type FileSource,
  type ImportResult,
  type OpenedRecord,
  type ProbeOutcome,
  type PythonProbe,
  type VaultInspector,
  type WriteAccess,
} from "../../src/application";
import { AjvSchemaValidator, FileSchemaLoader, YamlDocumentParser } from "../../src/infrastructure";
import { createValidation } from "../support/validation";

const REGISTRY = "specs/registry.yml";
const CONTRACT = "schemas/note.schema.yaml";
const BASE = ".schema-resources/tool/base.schema.yaml";
const BASE_URI = "https://example.org/tool/base.schema.yaml";
const RECORD = "notes/first.yml";
const ABSOLUTE = (path: string): string => `/vault/${path}`;

const CONTRACT_TEXT = [
  "$schema: https://json-schema.org/draft/2020-12/schema",
  "type: object",
  "allOf:",
  `  - $ref: '${BASE_URI}'`,
  "properties:",
  "  _schema: {const: 'demo:note@1'}",
  "  title: {type: string}",
  "",
].join("\n");

const BASE_TEXT = [
  "$schema: https://json-schema.org/draft/2020-12/schema",
  `$id: '${BASE_URI}'`,
  "type: object",
  "properties:",
  "  body: {type: string}",
  "",
].join("\n");

const REGISTRY_TEXT = [
  "schema_version: 2",
  "schemas:",
  `  'demo:note@1': '${CONTRACT}'`,
  "resources:",
  `  '${BASE_URI}': '${BASE}'`,
  "",
].join("\n");

const RECORD_TEXT = "_schema: demo:note@1\ntitle: First note\n";

const CHECKER: CustomCheckerRegistration = {
  name: "tool",
  ...FINDINGS_LOG_CHECKER,
  schemas: ["demo:*"],
  arguments: { command: ["-m", "tool", "check", "{folder}", "--format", "sarif"] },
};

const SETTINGS: EkphrasisSettings = {
  ...DEFAULT_SETTINGS,
  schemaRegistry: REGISTRY,
  pythonInterpreter: "/env/bin/python",
  customCheckerTimeout: 10_000,
  customCheckers: [CHECKER],
};

const FILES: Readonly<Record<string, string>> = {
  [REGISTRY]: REGISTRY_TEXT,
  [CONTRACT]: CONTRACT_TEXT,
  [BASE]: BASE_TEXT,
  [RECORD]: RECORD_TEXT,
};

/** Vault in memory: files below a hidden directory exist but are not indexed by Obsidian. */
interface VaultOptions {
  readonly files?: Readonly<Record<string, string>>;
  readonly hidden?: readonly string[];
  readonly indexedFolders?: readonly string[];
  readonly modified?: Readonly<Record<string, number>>;
  readonly access?: WriteAccess;
}

const HIDDEN = [".schema-resources", ".generated"];

function memoryVault(options: VaultOptions, settings: () => EkphrasisSettings) {
  const files = options.files ?? FILES;
  const hidden = options.hidden ?? HIDDEN;
  const isHidden = (path: string): boolean =>
    hidden.some((folder) => path === folder || path.startsWith(`${folder}/`));
  const source: FileSource = {
    read: (path) => {
      const text = files[path] ?? null;
      if (text === null) return Promise.resolve(null);
      if (!isHidden(path)) return Promise.resolve(text);
      const root = settings().schemaResourceRoot;
      return Promise.resolve(path.startsWith(`${root}/`) ? text : null);
    },
  };
  const inspector: VaultInspector = {
    isIndexedFile: (path) => path in files && !isHidden(path),
    isIndexedFolder: (path) => (options.indexedFolders ?? []).includes(path),
    exists: (path) =>
      Promise.resolve(
        path in files || Object.keys(files).some((file) => file.startsWith(`${path}/`)),
      ),
    modifiedAt: (path) => Promise.resolve(options.modified?.[path] ?? (path in files ? 0 : null)),
    writeAccess: () => Promise.resolve(options.access ?? { status: "writable" }),
  };
  return { source, inspector };
}

type Script = Partial<{
  [K in keyof PythonProbe]: PythonProbe[K];
}>;

const SARIF: CommandReport = {
  kind: "sarif",
  runs: 1,
  results: 3,
  defects: [],
  issues: [{ message: "The title is wrong.", severity: "error", pointer: "/title" }],
  conversionError: null,
};

function answer<T>(result: T): Promise<ProbeOutcome<T>> {
  return Promise.resolve({ status: "answered", result, durationMs: 1 });
}

/** Probe of a working environment, whose requests `script` overrides. */
function scriptedProbe(
  script: Script = {},
  durationMs = 2000,
  report = SARIF,
): PythonProbe & {
  readonly commands: number;
} {
  const counter = { commands: 0 };
  const probe: PythonProbe = {
    inspectInterpreter: () => Promise.resolve({ status: "executable" }),
    environment: () => answer({ version: "3.12.4", executable: "/env/bin/python" }),
    imports: (_interpreter, _cwd, targets) =>
      answer(
        targets.map((target): ImportResult => ({
          target: target.kind === "script" ? target.path : target.module,
          error: null,
          origin: "/env/lib/tool/__init__.py",
          durationMs: 40,
        })),
      ),
    packageData: (_interpreter, _cwd, name) =>
      answer({ package: name, root: `/env/lib/${name}`, readable: 12, unreadable: [] }),
    runCommand: () => {
      counter.commands += 1;
      return answer({ timedOut: false, durationMs, exitCode: 0, stderr: "", report });
    },
    callChecker: () => answer({ durationMs: 10, issues: [] }),
    ...script,
  };
  return Object.defineProperty(probe, "commands", {
    get: () => counter.commands,
  }) as PythonProbe & {
    readonly commands: number;
  };
}

interface Scenario {
  readonly settings?: EkphrasisSettings;
  readonly vault?: VaultOptions;
  readonly probe?: PythonProbe;
  readonly desktop?: boolean;
  /** Path of the opened record, or `null` for none. */
  readonly record?: string | null;
  readonly loadedAt?: number;
}

async function diagnose(scenario: Scenario = {}): Promise<DiagnosticReport> {
  const settings = scenario.settings ?? SETTINGS;
  const current = (): EkphrasisSettings => settings;
  const parser = new YamlDocumentParser();
  const { source, inspector } = memoryVault(scenario.vault ?? {}, current);
  const registry = new RegistryReader(parser, source, current);
  const loader = new FileSchemaLoader(source, registry);
  const recordPath = scenario.record === undefined ? RECORD : scenario.record;
  let record: OpenedRecord | null = null;
  if (recordPath !== null) {
    const text = (scenario.vault?.files ?? FILES)[recordPath] ?? "";
    const forms = new FormService(parser, loader, createValidation(), current, source);
    record = { path: recordPath, text, state: await forms.open(recordPath, text) };
  }
  const report = await runSetupDiagnostic({
    settings,
    desktop: scenario.desktop ?? true,
    record,
    registry,
    files: source,
    parser,
    loader,
    validator: new AjvSchemaValidator(),
    vault: inspector,
    probe: scenario.desktop === false ? null : (scenario.probe ?? scriptedProbe()),
    loadedAt: scenario.loadedAt ?? 1000,
    resolveFile: ABSOLUTE,
    now: () => 0,
  });
  expectWellFormed(report);
  return report;
}

/** Every check names its dependency, and carries an action exactly when it does not pass. */
function expectWellFormed(report: DiagnosticReport): void {
  const ids = report.checks.map(({ id }) => id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const check of report.checks) {
    expect(check.dependency).not.toBe("");
    expect(check.observed).not.toBe("");
    if (check.status === "pass") expect(check.action).toBeNull();
    else expect(check.action ?? "").not.toBe("");
  }
}

function check(report: DiagnosticReport, id: string): DiagnosticCheck {
  const found = report.checks.find((candidate) => candidate.id === id);
  if (found === undefined) {
    throw new Error(`no check ${id} in ${report.checks.map(({ id: key }) => key).join(", ")}`);
  }
  return found;
}

function nonPassing(report: DiagnosticReport): string[] {
  return report.checks.filter(({ status }) => status !== "pass").map(({ id }) => id);
}

const withFiles = (
  changes: Readonly<Record<string, string | null>>,
): Readonly<Record<string, string>> =>
  Object.fromEntries(
    Object.entries({ ...FILES, ...changes }).filter(
      (entry): entry is [string, string] => entry[1] !== null,
    ),
  );

describe("the setup diagnostic", () => {
  it("passes every check of a working setup, and runs the configured command once", async () => {
    const probe = scriptedProbe();
    const report = await diagnose({ probe });
    expect(nonPassing(report)).toEqual([]);
    expect(probe.commands).toBe(1);
    expect(check(report, "checker.report:tool").observed).toContain("1 on the opened record");
    expect(check(report, "checker.duration:tool").observed).toContain(
      "Each validation of a selected record starts the command again.",
    );
  });

  describe("schema registry", () => {
    it("fails on a missing registry, and blocks the checks that depend on it", async () => {
      const report = await diagnose({ vault: { files: withFiles({ [REGISTRY]: null }) } });
      expect(check(report, "registry.read")).toMatchObject({
        status: "fail",
        consequence: "forms",
      });
      expect(check(report, "registry.read").action).toContain("Generate the registry");
      expect(check(report, "registry.contracts").status).toBe("unavailable");
      expect(check(report, "record.form").status).toBe("fail");
    });

    it("fails on a registry that is no valid YAML", async () => {
      const report = await diagnose({
        vault: { files: withFiles({ [REGISTRY]: "schemas: [\n" }) },
      });
      expect(check(report, "registry.read").observed).toContain("invalid YAML");
      expect(check(report, "registry.read").action).toContain("correct its YAML syntax");
    });

    it("separates an unsupported version from a malformed registry", async () => {
      const report = await diagnose({
        vault: {
          files: withFiles({
            [REGISTRY]: REGISTRY_TEXT.replace("schema_version: 2", "schema_version: 3"),
          }),
        },
      });
      expect(check(report, "registry.read").status).toBe("pass");
      expect(check(report, "registry.version")).toMatchObject({ status: "fail" });
      expect(check(report, "registry.version").action).toContain("1 and 2");
    });

    it("asks for a registry when the opened record declares `_schema` and none is configured", async () => {
      const report = await diagnose({ settings: { ...SETTINGS, schemaRegistry: "" } });
      expect(check(report, "registry.setting").status).toBe("fail");
      expect(check(report, "registry.setting").action).toContain("*Schema registry*");
    });
  });

  describe("schema resources", () => {
    it("fails on a contract whose schema file is absent", async () => {
      const report = await diagnose({ vault: { files: withFiles({ [CONTRACT]: null }) } });
      expect(check(report, "registry.contracts").status).toBe("fail");
      expect(check(report, "registry.contracts").observed).toContain("is absent");
    });

    it("suggests the resource directory that holds generated schemas outside the configured one", async () => {
      const moved = ".generated/tool/base.schema.yaml";
      const report = await diagnose({
        vault: {
          files: withFiles({
            [BASE]: null,
            [moved]: BASE_TEXT,
            [REGISTRY]: REGISTRY_TEXT.replace(BASE, moved),
          }),
        },
      });
      expect(check(report, "registry.resources").status).toBe("fail");
      expect(check(report, "resources.directory")).toMatchObject({ status: "fail" });
      expect(check(report, "resources.directory").observed).toContain(
        "the compatibility default `.schema-resources`",
      );
      expect(check(report, "resources.directory").action).toContain("`.generated/tool`");
    });

    it("reads generated schemas from the configured directory, not from the default", async () => {
      const moved = ".generated/tool/base.schema.yaml";
      const report = await diagnose({
        settings: { ...SETTINGS, schemaResourceRoot: ".generated" },
        vault: {
          files: withFiles({
            [BASE]: null,
            [moved]: BASE_TEXT,
            [REGISTRY]: REGISTRY_TEXT.replace(BASE, moved),
          }),
        },
      });
      expect(nonPassing(report)).toEqual([]);
      expect(check(report, "resources.directory").observed).toContain("`.generated`");
    });

    it("fails on a resource directory that leaves the vault", async () => {
      const report = await diagnose({
        settings: { ...SETTINGS, schemaResourceRoot: "../outside" },
      });
      expect(check(report, "resources.directory").status).toBe("fail");
    });

    it("fails on an absolute reference that no resource of the registry maps", async () => {
      const missing = "https://example.org/tool/missing.schema.yaml";
      const report = await diagnose({
        vault: { files: withFiles({ [CONTRACT]: CONTRACT_TEXT.replace(BASE_URI, missing) }) },
      });
      expect(check(report, "schemas.references").status).toBe("fail");
      expect(check(report, "schemas.references").observed).toContain(missing);
      expect(check(report, "schemas.references").action).toContain("`resources`");
    });

    it("warns on layers composed by `allOf` that admit no common type", async () => {
      const report = await diagnose({
        vault: {
          files: withFiles({
            [BASE]: BASE_TEXT.replace("body: {type: string}", "title: {type: integer}"),
          }),
        },
      });
      expect(check(report, "schemas.composition")).toMatchObject({
        status: "warning",
        consequence: "degraded",
      });
      expect(check(report, "schemas.composition").observed).toContain("no common type");
    });

    it("explains a restart after a generated schema changed in an unindexed directory", async () => {
      const report = await diagnose({ vault: { modified: { [BASE]: 5000 } }, loadedAt: 1000 });
      expect(check(report, "resources.reload").status).toBe("warning");
      expect(check(report, "resources.reload").action).toContain("Restart Obsidian");
      const indexed = await diagnose({
        vault: { modified: { [BASE]: 5000 }, indexedFolders: [".schema-resources"] },
      });
      expect(check(indexed, "resources.reload").status).toBe("pass");
    });
  });

  describe("authored record", () => {
    it("reports the write check as unavailable when no record is open", async () => {
      const report = await diagnose({ record: null });
      expect(check(report, "record.write").status).toBe("unavailable");
      expect(check(report, "checker.report").status).toBe("unavailable");
    });

    it("fails on a record that the operating system refuses to write", async () => {
      const report = await diagnose({ vault: { access: { status: "denied", reason: "EACCES" } } });
      expect(check(report, "record.write")).toMatchObject({
        status: "fail",
        consequence: "saving",
      });
      expect(check(report, "record.write").action).toContain("Make the file writable");
    });

    it("separates a permission that cannot be checked from a refused one", async () => {
      const report = await diagnose({
        vault: { access: { status: "unknown", reason: "the mobile app exposes no permission" } },
      });
      expect(check(report, "record.write").status).toBe("unavailable");
    });

    it("fails on a record that Obsidian does not index, which a save cannot reach", async () => {
      const hiddenRecord = ".drafts/first.yml";
      const report = await diagnose({
        record: hiddenRecord,
        vault: {
          files: withFiles({ [hiddenRecord]: RECORD_TEXT }),
          hidden: [...HIDDEN, ".drafts"],
        },
      });
      expect(check(report, "record.indexed").status).toBe("fail");
    });

    it("names a generated schema or a read-only view rather than checking its write", async () => {
      const schema = await diagnose({ record: CONTRACT });
      expect(check(schema, "record.authored").status).toBe("warning");
      expect(check(schema, "record.write").status).toBe("unavailable");
      const view = await diagnose({
        vault: {
          files: withFiles({
            [CONTRACT]: CONTRACT_TEXT.replace(
              "type: object\nallOf",
              "type: object\nreadOnly: true\nallOf",
            ),
          }),
        },
      });
      expect(check(view, "record.authored").observed).toContain("read-only");
    });
  });

  describe("configured checkers", () => {
    it("fails on an absent, a relative or a non-executable interpreter, and blocks the probe", async () => {
      const absent = await diagnose({
        probe: scriptedProbe({ inspectInterpreter: () => Promise.resolve({ status: "missing" }) }),
      });
      expect(check(absent, "checker.interpreter").status).toBe("fail");
      for (const id of [
        "checker.launch",
        "checker.imports",
        "checker.package-data",
        "checker.report",
      ]) {
        expect(check(absent, id).status).toBe("unavailable");
      }
      const relative = await diagnose({ settings: { ...SETTINGS, pythonInterpreter: "python3" } });
      expect(check(relative, "checker.interpreter").observed).toContain("not an absolute path");
      const locked = await diagnose({
        probe: scriptedProbe({
          inspectInterpreter: () => Promise.resolve({ status: "not-executable", reason: "EACCES" }),
        }),
      });
      expect(check(locked, "checker.interpreter").observed).toContain("cannot be executed");
    });

    it("fails on a malformed schema pattern, and warns on an unclosed delimiter", async () => {
      const malformed = await diagnose({
        settings: { ...SETTINGS, customCheckers: [{ ...CHECKER, schemas: ["demo:[z-a]"] }] },
      });
      expect(check(malformed, "checker.patterns").status).toBe("fail");
      const unclosed = await diagnose({
        settings: { ...SETTINGS, customCheckers: [{ ...CHECKER, schemas: ["{demo:*"] }] },
      });
      expect(check(unclosed, "checker.patterns").status).toBe("warning");
    });

    it("fails when no contract of the registry matches the patterns of a checker", async () => {
      const report = await diagnose({
        settings: { ...SETTINGS, customCheckers: [{ ...CHECKER, schemas: ["other:*"] }] },
      });
      expect(check(report, "checker.selection").status).toBe("fail");
      expect(check(report, "checker.selection").action).toContain("`demo:note@1`");
      expect(check(report, "checker.record").status).toBe("warning");
    });

    it("fails on duplicate names and on a command that is no list of text", async () => {
      const report = await diagnose({
        settings: {
          ...SETTINGS,
          customCheckers: [
            CHECKER,
            CHECKER,
            { ...CHECKER, name: "broken", arguments: { command: "tool" } },
          ],
        },
      });
      expect(check(report, "checker.registrations").status).toBe("fail");
      expect(check(report, "checker.registrations").observed).toContain("registered twice");
      expect(check(report, "checker.registrations").observed).toContain("no list `command`");
    });

    it("fails when the interpreter does not start", async () => {
      const report = await diagnose({
        probe: scriptedProbe({
          environment: () =>
            Promise.resolve({ status: "launch-failed", code: "ENOENT", message: "spawn ENOENT" }),
        }),
      });
      expect(check(report, "checker.launch").status).toBe("fail");
      expect(check(report, "checker.launch").observed).toContain("ENOENT");
      expect(check(report, "checker.imports").status).toBe("unavailable");
    });

    it("fails on a package that the interpreter cannot import", async () => {
      const report = await diagnose({
        probe: scriptedProbe({
          imports: (_interpreter, _cwd, targets) =>
            answer(
              targets.map((target) => ({
                target: target.kind === "script" ? target.path : target.module,
                error: "ModuleNotFoundError: No module named 'tool'",
                origin: null,
                durationMs: 5,
              })),
            ),
        }),
      });
      expect(check(report, "checker.imports").status).toBe("fail");
      expect(check(report, "checker.imports").action).toContain("Install the missing package");
    });

    it("fails on package data that cannot be read", async () => {
      const report = await diagnose({
        probe: scriptedProbe({
          packageData: (_interpreter, _cwd, name) =>
            answer({
              package: name,
              root: "/env/lib/tool",
              readable: 3,
              unreadable: [
                { path: "/env/lib/tool/data/rules.yml", error: "PermissionError: denied" },
              ],
            }),
        }),
      });
      expect(check(report, "checker.package-data").status).toBe("fail");
      expect(check(report, "checker.package-data").observed).toContain("rules.yml");
    });

    it.each<[string, CommandReport, string]>([
      ["empty", { kind: "empty" }, "wrote nothing"],
      ["no JSON", { kind: "invalid-json", excerpt: "checked 1 file" }, "not JSON"],
      ["no SARIF", { kind: "not-sarif", reason: "its version is null" }, "no SARIF 2.1.0 log"],
      [
        "defective",
        { ...SARIF, defects: [{ index: 0, missing: ["message.text"] }] },
        "lack fields",
      ],
    ])("fails on a report that is %s", async (_label, report, observed) => {
      const result = await diagnose({ probe: scriptedProbe({}, 2000, report) });
      const run = check(result, "checker.report:tool");
      expect(run.status).toBe("fail");
      expect(run.observed).toContain(observed);
      expect(run.details.join("\n")).toContain(
        "/env/bin/python -m tool check /vault/notes --format sarif",
      );
    });

    it("compares the measured duration with the timeout, and recommends a timeout", async () => {
      const close = await diagnose({ probe: scriptedProbe({}, 8000) });
      expect(check(close, "checker.duration:tool")).toMatchObject({ status: "warning" });
      expect(check(close, "checker.duration:tool").action).toContain("16.0 s");
      const over = await diagnose({ probe: scriptedProbe({}, 12_000) });
      expect(check(over, "checker.duration:tool").status).toBe("fail");
      expect(check(over, "checker.duration:tool").action).toContain("24.0 s");
    });

    it("reports a command that exceeds the largest admissible timeout", async () => {
      const report = await diagnose({
        probe: scriptedProbe({
          runCommand: () =>
            answer({
              timedOut: true,
              durationMs: 120_000,
              exitCode: null,
              stderr: "",
              report: { kind: "empty" },
            }),
        }),
      });
      expect(check(report, "checker.report:tool").observed).toContain("largest timeout");
    });

    it("measures a registered function through one call, without starting a command", async () => {
      const probe = scriptedProbe();
      const report = await diagnose({
        probe,
        settings: {
          ...SETTINGS,
          customCheckers: [
            { name: "symbols", module: "project.checks", function: "symbols", schemas: ["demo:*"] },
          ],
        },
      });
      expect(nonPassing(report)).toEqual([]);
      expect(probe.commands).toBe(0);
      expect(check(report, "checker.duration:symbols").observed).toContain(
        "calls the function in the running checker process",
      );
    });

    it("reports Python checkers as unavailable on mobile, without failing forms or records", async () => {
      const report = await diagnose({
        desktop: false,
        vault: { access: { status: "unknown", reason: "the mobile app exposes no permission" } },
      });
      const checker = report.checks.filter(({ id }) => id.startsWith("checker."));
      expect(checker).toHaveLength(1);
      expect(checker[0]).toMatchObject({ id: "checker.platform", status: "unavailable" });
      expect(checker[0]?.observed).toContain("forms and built-in checks remain available");
      expect(statusCounts(report.checks).fail).toBe(0);
    });
  });

  it("stays complete and readable when several dependencies fail at once", async () => {
    const report = await diagnose({
      vault: {
        files: withFiles({ [REGISTRY]: null }),
        access: { status: "denied", reason: "EROFS" },
      },
      probe: scriptedProbe({ inspectInterpreter: () => Promise.resolve({ status: "missing" }) }),
    });
    expect(check(report, "registry.read").status).toBe("fail");
    expect(check(report, "record.write").status).toBe("fail");
    expect(check(report, "checker.interpreter").status).toBe("fail");
    const text = reportText(report);
    for (const title of [
      "Blocks schema-derived forms",
      "Blocks saving authored records",
      "Blocks configured custom checks",
    ]) {
      expect(text).toContain(`## ${title}`);
    }
    expect(text).toContain("Next action: Generate the registry");
  });

  it("turns an unexpected error of one family into a check, and keeps the others", async () => {
    const report = await diagnose({
      probe: scriptedProbe({
        environment: () => Promise.reject(new TypeError("probe exploded")),
      }),
    });
    expect(check(report, "diagnostic.checkers")).toMatchObject({ status: "fail" });
    expect(check(report, "diagnostic.checkers").details).toEqual(["TypeError: probe exploded"]);
    expect(check(report, "registry.read").status).toBe("pass");
  });
});
