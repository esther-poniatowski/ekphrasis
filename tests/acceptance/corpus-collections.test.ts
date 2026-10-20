/**
 * Optional corpus test of structural edits, on the records of the consumer project named by the
 * environment variable `EKPHRASIS_CORPUS`, read and never modified. Each record receives the
 * structural commits of the golden test of byte preservation, each on its original text, and
 * every written commit must keep the comments and change no byte outside its collection. Two
 * parts run, each when the corpus holds the files that it needs:
 *
 * - gnomon (`src/gnomon/data/requirements.yml`): each target-system record, under the
 *   target-system schema of the fixtures, since gnomon declares no JSON Schema;
 * - geonexus (`config/checks.yaml`): each record of the file type `glossary`, under its schema.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { CommitService, type FormReady } from "../../src/application";
import { buildFormModel, GlobPattern, isJsonObject, type SchemaSet } from "../../src/domain";
import { YamlParseError } from "../../src/errors";
import { FileSchemaLoader, YamlDocumentParser, YamlSourceEditor } from "../../src/infrastructure";
import { DirectoryFileSource } from "../support/fixture-vault";
import { checkStructuralCommits } from "../support/golden-edits";
import { createValidation } from "../support/validation";
import {
  CORPUS_VARIABLE,
  FIXTURES_ROOT,
  readYamlFiles,
  type YamlFile,
} from "../support/yaml-files";

const corpusRoot = process.env[CORPUS_VARIABLE];
const parser = new YamlDocumentParser();
const validation = createValidation();
const commits = new CommitService(parser, new YamlSourceEditor(), validation);

const has = (path: string): boolean =>
  corpusRoot !== undefined && existsSync(join(corpusRoot, path));

/** Form state of `text` under `schemas`, or `null` when the text fails to parse. */
function stateOf(
  schemas: SchemaSet,
  schemaPath: string,
  { name, text }: YamlFile,
): FormReady | null {
  let tree;
  try {
    tree = parser.parse(text);
  } catch (error) {
    if (!(error instanceof YamlParseError)) throw error;
    console.log(`${name}: skipped, since its text fails to parse.`);
    return null;
  }
  const model = buildFormModel(schemas, tree, text);
  return {
    status: "form",
    binding: { schemaPath, source: "path-rule", reference: schemaPath },
    model,
    report: validation.validate(schemas, model, tree),
    schemas,
    schemaPaths: schemas.paths,
  };
}

/** Checks the structural commits of each record of `records`, and prints the commits written. */
function checkRecords(schemas: SchemaSet, schemaPath: string, records: readonly YamlFile[]): void {
  const failures: string[] = [];
  let written = 0;
  for (const record of records) {
    const state = stateOf(schemas, schemaPath, record);
    if (state === null) continue;
    const outcome = checkStructuralCommits(commits, state, record.text);
    failures.push(...outcome.failures.map((failure) => `${record.name}: ${failure}`));
    written += outcome.written;
  }
  console.log(`${schemaPath}: ${records.length} records, ${written} structural commits written.`);
  expect(failures, failures.join("\n")).toEqual([]);
  expect(written).toBeGreaterThan(0);
}

describe.skipIf(!has("src/gnomon/data/requirements.yml"))("gnomon corpus", () => {
  it("edits the record tables of every target-system record", async () => {
    const records = readYamlFiles(corpusRoot ?? "").filter(({ text }) =>
      /^type: target-system\s*$/m.test(text),
    );
    expect(records.length).toBeGreaterThan(0);
    const schemaPath = "gnomon/schemas/target-system.schema.yaml";
    const schemas = await new FileSchemaLoader(new DirectoryFileSource(FIXTURES_ROOT)).load(
      schemaPath,
    );
    checkRecords(schemas, schemaPath, records);
  });
});

describe.skipIf(!has("config/checks.yaml"))("geonexus corpus", () => {
  it("edits the keyed records of every glossary", async () => {
    const root = corpusRoot ?? "";
    const registry: unknown = parse(
      readFileSync(join(root, "specs/vocabulary/file-types.yml"), "utf8"),
    );
    const types = isJsonObject(registry as never)
      ? ((registry as { file_types?: Record<string, { schema: string; paths: string[] }> })
          .file_types ?? {})
      : {};
    const glossary = types["glossary"];
    if (glossary === undefined) throw new Error("No file type `glossary` in the registry.");
    const patterns = glossary.paths.map((path) => new GlobPattern(path));
    const records = readYamlFiles(root).filter(({ name }) =>
      patterns.some((pattern) => pattern.matches(name)),
    );
    const schemaPath = `utils/schemas/${glossary.schema}`;
    const schemas = await new FileSchemaLoader(new DirectoryFileSource(root)).load(schemaPath);
    checkRecords(schemas, schemaPath, records);
  });
});
