/**
 * Exit criterion of the milestone *Guidance and navigation*: a question record of gnomon, filled
 * only through the form, needs no consultation of the template comments.
 *
 * The form carries the guidance of a template when it displays, at each key of the template, the
 * admitted values that a comment lists, the instructions that a comment gives, and an example of
 * the value that a placeholder shows, as `template-guidance.ts` defines them. Two texts are
 * measured against the question schema of the fixtures:
 *
 * - the question fixture, whose comments reproduce those of a gnomon record;
 * - the question template of gnomon, `src/gnomon/data/templates/question.yml`, read from the
 *   corpus named by the environment variable `EKPHRASIS_CORPUS` when it holds that file.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FileSchemaLoader } from "../../src/infrastructure";
import { DirectoryFileSource } from "../support/fixture-vault";
import { guidanceGaps, listedValues } from "../support/template-guidance";
import { CORPUS_VARIABLE, FIXTURES_ROOT } from "../support/yaml-files";

const SCHEMA = "gnomon/schemas/question.schema.yaml";
const TEMPLATE = "src/gnomon/data/templates/question.yml";
const corpusRoot = process.env[CORPUS_VARIABLE];
const templatePath = corpusRoot === undefined ? null : join(corpusRoot, TEMPLATE);
const hasTemplate = templatePath !== null && existsSync(templatePath);

const schemas = () => new FileSchemaLoader(new DirectoryFileSource(FIXTURES_ROOT)).load(SCHEMA);

describe("values listed by a comment", () => {
  it("reads each value around the separators, without the explanations in parentheses", () => {
    expect(listedValues("posed | refined | answered")).toEqual(["posed", "refined", "answered"]);
    expect(
      listedValues("constitutive (the product test applies it) | preferred (appraisal ranks)"),
    ).toEqual(["constitutive", "preferred"]);
    expect(
      listedValues("one maturity per field: open | provisional | stabilized; the rest"),
    ).toEqual(["open", "provisional", "stabilized"]);
    expect(listedValues("restate the fields")).toEqual([]);
  });
});

describe("guidance of the question form", () => {
  it("carries the guidance of the comments and placeholders of the question fixture", async () => {
    const text = readFileSync(join(FIXTURES_ROOT, "gnomon/question.yml"), "utf8");
    // The header of the fixture lists its constructs, so it instructs no author.
    expect(guidanceGaps(await schemas(), text, { header: false })).toEqual([]);
  });

  it("reports a key outside the schema, an unlisted value, a comment without instructions, and a placeholder without example", async () => {
    const text = [
      "status: posed # posed | withdrawn",
      "title: SHORT NAME",
      "type: question # the only type",
      "extra: 1 # unknown",
      "virtues:",
      '  - check: { evidence: "EVIDENCE OF THE VERDICT" }',
      "",
    ].join("\n");
    expect(guidanceGaps(await schemas(), text, { header: false })).toEqual([
      { path: "status", missing: "admitted values", detail: "withdrawn" },
      { path: "type", missing: "instructions", detail: "the only type" },
      { path: "extra", missing: "field", detail: "no field of the form holds this key" },
      { path: "virtues[0].check.evidence", missing: "example", detail: "EVIDENCE OF THE VERDICT" },
    ]);
  });
});

describe.skipIf(!hasTemplate)(`gnomon template named by ${CORPUS_VARIABLE}`, () => {
  it("carries every comment and placeholder of the question template", async () => {
    const text = readFileSync(templatePath ?? "", "utf8");
    const gaps = await schemas().then((set) => guidanceGaps(set, text));
    expect(
      gaps,
      gaps.map((gap) => `${gap.path}: ${gap.missing} (${gap.detail})`).join("\n"),
    ).toEqual([]);
  });
});
