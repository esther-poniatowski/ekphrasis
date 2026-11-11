/**
 * Optional integration test of generated-view freshness against the producer command. The four
 * environment variables name the producer checkout, generated views, their source records, and
 * the Python interpreter that can import the producer. The consumer copies no producer logic.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  CustomCheckerService,
  DEFAULT_SETTINGS,
  FormService,
  RegistryReader,
  SOURCE_STATE_CHECKER,
} from "../../src/application";
import {
  FileSchemaLoader,
  PythonCheckerProcess,
  YamlDocumentParser,
} from "../../src/infrastructure";
import { DirectoryFileSource } from "../support/fixture-vault";
import { createValidation } from "../support/validation";
import { CHECKER_PYTHON_VARIABLE, GNOMON_REGISTRY } from "../support/gnomon-checker";
import { CORPUS_VARIABLE, readYamlFiles } from "../support/yaml-files";

const VIEWS_VARIABLE = "EKPHRASIS_VIEWS";
const VIEW_SOURCE_VARIABLE = "EKPHRASIS_VIEW_SOURCE";
const corpus = process.env[CORPUS_VARIABLE];
const views = process.env[VIEWS_VARIABLE];
const source = process.env[VIEW_SOURCE_VARIABLE];
const python = process.env[CHECKER_PYTHON_VARIABLE];
const enabled =
  corpus !== undefined &&
  views !== undefined &&
  source !== undefined &&
  python !== undefined &&
  existsSync(join(corpus, GNOMON_REGISTRY));

const registration = {
  name: "view-freshness",
  ...SOURCE_STATE_CHECKER,
  schemas: ["gnomon:view.*"],
  arguments: {
    command: ["-m", "gnomon", "source-state", "."],
    root: source ?? "",
    pointer: "/source_state",
  },
};
const runner = enabled ? new PythonCheckerProcess(python ?? "", [registration], 120_000) : null;

afterAll(async () => runner?.close());

describe.skipIf(!enabled)("current Gnomon views", () => {
  const parser = new YamlDocumentParser();
  const files = new DirectoryFileSource(corpus ?? "");
  const settings = () => ({ ...DEFAULT_SETTINGS, schemaRegistry: GNOMON_REGISTRY });
  const checkers = new CustomCheckerService(
    () => [registration],
    () => runner,
    (path) => join(views ?? "", path),
  );
  const forms = new FormService(
    parser,
    new FileSchemaLoader(files, new RegistryReader(parser, files, settings)),
    createValidation(),
    settings,
    files,
    checkers,
  );
  const generated = readYamlFiles(views ?? "").filter(({ text }) =>
    /^_schema:\s*gnomon:view\./m.test(text),
  );

  it("checks at least one generated view", () => {
    expect(generated.length).toBeGreaterThan(0);
  });

  it.each(generated)("identifies $name as current", async ({ name, text }) => {
    const state = await forms.open(name, text);
    expect(state.status).toBe("form");
    if (state.status !== "form") return;
    expect(state.report.issues).toEqual([]);
    expect(state.report.contexts).toContainEqual(
      expect.objectContaining({
        checker: "view-freshness",
        label: "Source state",
        value: "current",
      }),
    );
  });
});
