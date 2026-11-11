/**
 * Acceptance test of the setup diagnostic on a vault written to disk, with a real Python
 * interpreter and the fixture package of a tool whose command writes a findings log.
 *
 * A working setup passes every check; the run changes no file of the vault or of the package, and
 * no setting. Then dependencies are broken one at a time, and several at once, and each break
 * yields the check and the corrective action that a researcher needs.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  FINDINGS_LOG_CHECKER,
  FormService,
  RegistryReader,
  runSetupDiagnostic,
  type DiagnosticCheck,
  type DiagnosticReport,
  type EkphrasisSettings,
} from "../../src/application";
import {
  AjvSchemaValidator,
  FileSchemaLoader,
  PythonSetupProbe,
  YamlDocumentParser,
} from "../../src/infrastructure";
import { writeCheckerPackages } from "../support/checker-package";
import { diskVault } from "../support/disk-vault";
import { createValidation } from "../support/validation";

const interpreter = process.env["PYTHON"] ?? "python3";
const root = mkdtempSync(join(tmpdir(), "ekphrasis-diagnostic-"));
const vault = join(root, "vault");
const packages = join(root, "env");
const RECORD = "inquiry/record.yml";

const VAULT_FILES: Readonly<Record<string, string>> = {
  "specs/registry.yml": [
    "schema_version: 2",
    "schemas:",
    "  'demo:note@1': 'schemas/note.schema.yaml'",
    "resources:",
    "  'https://example.org/tool/base.schema.yaml': '.schema-resources/tool/base.schema.yaml'",
    "",
  ].join("\n"),
  "schemas/note.schema.yaml": [
    "type: object",
    "allOf:",
    "  - $ref: 'https://example.org/tool/base.schema.yaml'",
    "properties:",
    "  _schema: {const: 'demo:note@1'}",
    "  title: {type: string}",
    "",
  ].join("\n"),
  ".schema-resources/tool/base.schema.yaml": [
    "$id: 'https://example.org/tool/base.schema.yaml'",
    "type: object",
    "properties:",
    "  body: {type: string}",
    "",
  ].join("\n"),
  [RECORD]: "_schema: demo:note@1\ntitle: First note\n",
};

for (const [path, text] of Object.entries(VAULT_FILES)) {
  mkdirSync(dirname(join(vault, path)), { recursive: true });
  writeFileSync(join(vault, path), text);
}
mkdirSync(packages);
writeCheckerPackages(packages);

afterAll(() => {
  chmodSync(join(packages, "lockedpkg", "data", "rules.yml"), 0o644);
  rmSync(root, { recursive: true, force: true });
});

const CHECKER = {
  name: "tool",
  ...FINDINGS_LOG_CHECKER,
  schemas: ["demo:*"],
  arguments: { command: ["-m", "fakechk", "ok", "{folder}"] },
};

const SETTINGS: EkphrasisSettings = {
  ...DEFAULT_SETTINGS,
  schemaRegistry: "specs/registry.yml",
  pythonInterpreter: interpreter,
  customCheckerTimeout: 30_000,
  customCheckers: [CHECKER],
};

/** Absolute path of the interpreter, as the settings require it, read from Python itself. */
function absoluteInterpreter(): string {
  const run = spawnSync(interpreter, ["-B", "-c", "import sys; print(sys.executable)"], {
    encoding: "utf8",
  });
  return run.stdout.trim();
}

async function diagnose(settings: EkphrasisSettings): Promise<DiagnosticReport> {
  const current = (): EkphrasisSettings => settings;
  const parser = new YamlDocumentParser();
  const { files, inspector } = diskVault(vault, current);
  const registry = new RegistryReader(parser, files, current);
  const loader = new FileSchemaLoader(files, registry);
  const text = readFileSync(join(vault, RECORD), "utf8");
  const state = await new FormService(parser, loader, createValidation(), current, files).open(
    RECORD,
    text,
  );
  return runSetupDiagnostic({
    settings,
    desktop: true,
    record: { path: RECORD, text, state },
    registry,
    files,
    parser,
    loader,
    validator: new AjvSchemaValidator(),
    vault: inspector,
    probe: new PythonSetupProbe({ ...process.env, PYTHONPATH: packages }),
    loadedAt: Date.now() + 60_000,
    resolveFile: (path) => join(vault, path),
    now: () => Date.now(),
  });
}

function check(report: DiagnosticReport, id: string): DiagnosticCheck {
  const found = report.checks.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no check ${id}`);
  return found;
}

/** Path, mode and digest of every file below `folder`. */
function snapshot(folder: string): string[] {
  const entries: string[] = [];
  const visit = (path: string): void => {
    for (const name of readdirSync(path).sort()) {
      const child = join(path, name);
      const stats = statSync(child);
      if (stats.isDirectory()) {
        entries.push(`${child}/ ${stats.mode}`);
        visit(child);
      } else {
        const digest =
          stats.mode & 0o400
            ? createHash("sha256").update(readFileSync(child)).digest("hex")
            : String(stats.mtimeMs);
        entries.push(`${child} ${stats.mode} ${digest}`);
      }
    }
  };
  visit(folder);
  return entries;
}

describe("the setup diagnostic on a vault on disk", () => {
  const settings = Object.freeze({ ...SETTINGS, pythonInterpreter: absoluteInterpreter() });

  it("passes a working setup, and changes no file, setting or environment", async () => {
    const before = snapshot(root);
    const stored = JSON.stringify(settings);
    const report = await diagnose(settings);
    expect(report.checks.filter(({ status }) => status !== "pass")).toEqual([]);
    expect(check(report, "checker.report:tool").observed).toContain("1 on the opened record");
    expect(snapshot(root)).toEqual(before);
    expect(JSON.stringify(settings)).toBe(stored);
  });

  it("fails on a planted missing package, with the action that installs it", async () => {
    const report = await diagnose({
      ...settings,
      customCheckers: [
        {
          ...CHECKER,
          arguments: { command: ["-m", "absent_tool", "check", "{folder}"] },
        },
      ],
    });
    const imports = check(report, "checker.imports");
    expect(imports.status).toBe("fail");
    expect(imports.observed).toContain("No module named 'absent_tool'");
    expect(imports.action).toContain("Install the missing package");
    const run = check(report, "checker.report:tool");
    expect(run.status).toBe("fail");
    expect(run.details.join("\n")).toContain("No module named absent_tool");
  });

  it("fails on a record that the operating system refuses to write", async () => {
    const path = join(vault, RECORD);
    chmodSync(path, 0o444);
    try {
      const report = await diagnose(settings);
      expect(check(report, "record.write")).toMatchObject({ status: "fail" });
    } finally {
      chmodSync(path, 0o644);
    }
  });

  it("remains complete when the registry, the interpreter and the report fail together", async () => {
    const report = await diagnose({
      ...settings,
      schemaRegistry: "specs/absent.yml",
      pythonInterpreter: join(root, "absent", "python"),
    });
    expect(check(report, "registry.read").status).toBe("fail");
    expect(check(report, "record.form").status).toBe("fail");
    expect(check(report, "checker.interpreter").status).toBe("fail");
    expect(check(report, "record.write").status).toBe("pass");
    for (const item of report.checks) {
      if (item.status !== "pass") expect(item.action).not.toBeNull();
    }
  });
});
