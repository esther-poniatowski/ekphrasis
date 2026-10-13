/**
 * Optional corpus test of validation, on the records of the consumer project named by the
 * environment variable `EKPHRASIS_CORPUS`, read and never modified. Two parts run, each when the
 * corpus holds the files that it needs:
 *
 * - gnomon (`src/gnomon/data/requirements.yml`): each question record is validated against the
 *   question schema of the fixtures. The fields reported by the rule of the epistemic aim must
 *   equal those that the registry `by_aim` of gnomon requires and the record leaves unfilled,
 *   computed here from the registry itself.
 * - geonexus (`config/checks.yaml`): each schema of a file type compiles, and each record bound
 *   to it by its path patterns is validated without failure; the issues found, and the records
 *   whose text fails to parse, are printed.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { ValidationService } from "../../src/application";
import {
  buildFormModel,
  GlobPattern,
  InstanceData,
  isJsonObject,
  UnfilledValues,
  type JsonValue,
  type YamlNode,
} from "../../src/domain";
import { YamlParseError } from "../../src/errors";
import { AjvSchemaValidator, FileSchemaLoader, YamlDocumentParser } from "../../src/infrastructure";
import { DirectoryFileSource } from "../support/fixture-vault";
import { CORPUS_VARIABLE, FIXTURES_ROOT, readYamlFiles } from "../support/yaml-files";

const corpusRoot = process.env[CORPUS_VARIABLE];
const parser = new YamlDocumentParser();
const validation = new ValidationService(new AjvSchemaValidator());

const REGISTRY = "src/gnomon/data/requirements.yml";
const CHECKS = "config/checks.yaml";
const has = (path: string): boolean =>
  corpusRoot !== undefined && existsSync(join(corpusRoot, path));

/**
 * Parsed YAML file at `path` of the corpus, or `null` when absent. A skipped suite still runs its
 * body, so each suite reads its files through this guard.
 */
function readCorpusYaml(path: string): unknown {
  return has(path) ? parse(readFileSync(join(corpusRoot ?? "", path), "utf8")) : null;
}

/** Values that gnomon counts as unfilled, as `unmet_by_aim` of `completeness.py` does. */
const GNOMON_UNFILLED = new UnfilledValues(["open", [], {}]);

describe.skipIf(!has(REGISTRY))(`gnomon corpus named by ${CORPUS_VARIABLE}`, () => {
  const root = corpusRoot ?? "";
  const registry = (readCorpusYaml(REGISTRY) ?? { by_aim: {} }) as {
    by_aim: Record<string, { required?: { path: string }[] }>;
  };
  const questions = (has(REGISTRY) ? readYamlFiles(root) : []).filter(({ text }) =>
    /^type: question\s*$/m.test(text),
  );

  it("holds question records", () => {
    expect(questions.length).toBeGreaterThan(0);
  });

  it.each(questions)("reports the fields that the aim requires in $name", async ({ text }) => {
    const schemas = await new FileSchemaLoader(new DirectoryFileSource(FIXTURES_ROOT)).load(
      "gnomon/schemas/question.schema.yaml",
    );
    const tree = parser.parse(text);
    const report = validation.validate(schemas, buildFormModel(schemas, tree, text), tree);
    const reported = report.issues
      .filter(({ checker }) => checker === "required-when")
      .map(({ id }) => id);

    const data = InstanceData.fromTree(tree, GNOMON_UNFILLED);
    const aim = data.at(["task", "epistemic_aim"]);
    const required = (typeof aim === "string" ? registry.by_aim[aim]?.required : undefined) ?? [];
    const expected = required
      .map(({ path }) => path)
      .filter((path) => path.startsWith("question."))
      .map((path) => path.slice("question.".length))
      .filter((path) => GNOMON_UNFILLED.has(data.at(path.split("."))));
    expect(reported.sort()).toEqual(expected.sort());
  });
});

interface FileType {
  readonly schema: string;
  readonly paths: readonly string[];
}

describe.skipIf(!has(CHECKS))(`geonexus corpus named by ${CORPUS_VARIABLE}`, () => {
  const root = corpusRoot ?? "";
  const checks = readCorpusYaml(CHECKS) as JsonValue;
  const types =
    isJsonObject(checks) && isJsonObject(checks["glossary"])
      ? (checks["glossary"]["file_types"] as unknown as Record<string, FileType>)
      : {};
  const files = has(CHECKS) ? readYamlFiles(root) : [];
  const loader = new FileSchemaLoader(new DirectoryFileSource(root));

  it.each(Object.entries(types))("validates the records of the file type %s", async (_, type) => {
    const schemas = await loader.load(`utils/schemas/${type.schema}`);
    expect(() => new AjvSchemaValidator().compile(schemas)).not.toThrow();
    const patterns = type.paths.map((path) => new GlobPattern(path));
    const records = files.filter(({ name }) => patterns.some((pattern) => pattern.matches(name)));
    let validated = 0;
    for (const { name, text } of records) {
      let tree: YamlNode;
      try {
        tree = parser.parse(text);
      } catch (error) {
        if (!(error instanceof YamlParseError)) throw error;
        console.log(`${name}: skipped, since its text fails to parse: ${error.message}`);
        continue;
      }
      const report = validation.validate(schemas, buildFormModel(schemas, tree, text), tree);
      expect(report.schemaIssues).toEqual([]);
      validated += 1;
      for (const issue of report.issues) console.log(`${name}: ${issue.id}: ${issue.message}`);
    }
    console.log(`${type.schema}: ${validated} records validated.`);
  });
});
