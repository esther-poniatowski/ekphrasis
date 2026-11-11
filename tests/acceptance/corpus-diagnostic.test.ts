/**
 * Optional corpus test of the setup diagnostic, on the Gnomon checkout named by the environment
 * variable `EKPHRASIS_CORPUS`, with the interpreter named by `EKPHRASIS_CHECKER_PYTHON`. Gnomon is
 * configured here, as a researcher configures it in the settings; the runtime source names no
 * consumer project.
 *
 * The opened record is the first model record of the corpus. The folder of that record is copied
 * into a temporary folder, on which the configured command runs, so that the checkout is never
 * written. The diagnostic must pass the schema and record checks, run the Gnomon command once,
 * read a valid findings log, and report the measured duration against the timeout.
 */
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  FormService,
  RegistryReader,
  reportText,
  runSetupDiagnostic,
  type EkphrasisSettings,
} from "../../src/application";
import {
  AjvSchemaValidator,
  FileSchemaLoader,
  PythonSetupProbe,
  YamlDocumentParser,
} from "../../src/infrastructure";
import { diskVault } from "../support/disk-vault";
import {
  CHECKER_PYTHON_VARIABLE,
  GNOMON_CHECKER,
  GNOMON_REGISTRY,
} from "../support/gnomon-checker";
import { createValidation } from "../support/validation";
import { CORPUS_VARIABLE, readYamlFiles } from "../support/yaml-files";

const corpusRoot = process.env[CORPUS_VARIABLE];
const interpreter = process.env[CHECKER_PYTHON_VARIABLE];
const ready = corpusRoot !== undefined && interpreter !== undefined;
const copy = mkdtempSync(join(tmpdir(), "ekphrasis-gnomon-diagnostic-"));

afterAll(() => rmSync(copy, { recursive: true, force: true }));

describe.skipIf(!ready)(`Setup diagnostic on the corpus named by ${CORPUS_VARIABLE}`, () => {
  it("passes the schema checks of the Gnomon registry, and measures the Gnomon checker once", async () => {
    if (corpusRoot === undefined || interpreter === undefined) return;
    const record = readYamlFiles(corpusRoot).find((file) =>
      /^_schema:\s*["']?gnomon:model@/m.test(file.text),
    );
    expect(record, "the corpus holds a model record").toBeDefined();
    if (record === undefined) return;
    const folder = join(copy, "inquiry");
    cpSync(join(corpusRoot, dirname(record.name)), folder, { recursive: true });

    const settings: EkphrasisSettings = {
      ...DEFAULT_SETTINGS,
      schemaRegistry: GNOMON_REGISTRY,
      pythonInterpreter: interpreter,
      customCheckers: [GNOMON_CHECKER],
    };
    const current = (): EkphrasisSettings => settings;
    const parser = new YamlDocumentParser();
    const { files, inspector } = diskVault(corpusRoot, current);
    const registry = new RegistryReader(parser, files, current);
    const loader = new FileSchemaLoader(files, registry);
    const state = await new FormService(parser, loader, createValidation(), current, files).open(
      record.name,
      record.text,
    );
    const report = await runSetupDiagnostic({
      settings,
      desktop: true,
      record: { path: record.name, text: record.text, state },
      registry,
      files,
      parser,
      loader,
      validator: new AjvSchemaValidator(),
      vault: inspector,
      probe: new PythonSetupProbe(),
      loadedAt: Date.now() + 60_000,
      resolveFile: (path) =>
        path === record.name ? join(folder, path.split("/").at(-1) ?? "") : join(corpusRoot, path),
      now: () => Date.now(),
    });
    console.info(reportText(report));

    const failing = report.checks.filter(({ status }) => status === "fail");
    expect(failing.map(({ id, observed }) => `${id}: ${observed}`)).toEqual(
      report.checks
        .filter(({ id, status }) => status === "fail" && id.startsWith("checker.duration:"))
        .map(({ id, observed }) => `${id}: ${observed}`),
    );
    for (const id of ["registry.read", "registry.contracts", "registry.resources", "record.form"]) {
      expect(report.checks.find((check) => check.id === id)?.status, id).toBe("pass");
    }
    expect(report.checks.find(({ id }) => id === "checker.report:gnomon")?.status).toBe("pass");
    expect(report.checks.find(({ id }) => id === "checker.duration:gnomon")).toBeDefined();
  }, 180_000);
});
