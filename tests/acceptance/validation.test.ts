/**
 * Exit criterion of the milestone *Validation*: the conditional rule of gnomon, in which the
 * epistemic aim of a question decides the required fields, is expressed in a schema and reported
 * correctly on the fixtures.
 *
 * The expected fields follow the entries of `by_aim` in the registry `requirements.yml` of gnomon
 * that bear on the question record, where `null`, `[]`, `{}` and `open` count as unfilled:
 *
 * | Aim | Fields of the question required |
 * | --- | --- |
 * | `prediction` | `task.required_accuracy.outputs_to_match` |
 * | `explanation` | `subject.contrast.foil_set`, `task.requested_relation` |
 * | `modal-knowledge` | `task.modal_strength`, `task.proof_obligations` |
 * | `description`, `exploration`, `model-knowledge` | none |
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, FormService, type FormReady } from "../../src/application";
import { IssueIndex } from "../../src/domain";
import { FileSchemaLoader, YamlDocumentParser } from "../../src/infrastructure";
import { DirectoryFileSource, FIXTURE_BINDINGS, FIXTURE_RULES } from "../support/fixture-vault";
import { createValidation } from "../support/validation";
import { FIXTURES_ROOT, readYamlFiles } from "../support/yaml-files";

const forms = new FormService(
  new YamlDocumentParser(),
  new FileSchemaLoader(new DirectoryFileSource(FIXTURES_ROOT)),
  createValidation(),
  () => ({ ...DEFAULT_SETTINGS, pathRules: FIXTURE_RULES }),
);

const QUESTION = "gnomon/question.yml";
const files = new Map(readYamlFiles(FIXTURES_ROOT).map(({ name, text }) => [name, text]));
const question = files.get(QUESTION) ?? "";

async function open(name: string, text: string): Promise<FormReady> {
  const state = await forms.open(name, text);
  if (state.status !== "form") throw new Error(`Expected a form, got ${state.status}.`);
  return state;
}

/** Text of the question fixture with its epistemic aim replaced by `aim`. */
function withAim(aim: string, text = question): string {
  const changed = text.replace(/^ {2}epistemic_aim: explanation/m, `  epistemic_aim: ${aim}`);
  if (changed === text && aim !== "explanation") throw new Error("The aim line was not found.");
  return changed;
}

/** Printed paths and checkers of the issues of a form. */
function issuesOf(state: FormReady): [string, string, boolean][] {
  return state.report.issues.map(({ id, checker, missing }) => [id, checker, missing]);
}

describe("conditional rule of gnomon on the question fixture", () => {
  it.each([
    ["description", []],
    ["exploration", []],
    ["prediction", []],
    ["explanation", [["task.requested_relation", "required-when", true]]],
    ["modal-knowledge", [["task.proof_obligations", "required-when", true]]],
    ["model-knowledge", []],
    ["open", [["task.epistemic_aim", "required", true]]],
  ] as const)(
    "with the aim %s, reports the unfilled fields that the aim requires",
    async (aim, expected) => {
      const state = await open(QUESTION, withAim(aim));
      expect(issuesOf(state)).toEqual(expected);
      expect(state.report.schemaIssues).toEqual([]);
    },
  );

  it("reports a required field inside an absent group at the field itself", async () => {
    const text = withAim("prediction").replace(
      / {2}required_accuracy:[\s\S]*?(?= {2}proof_obligations)/,
      "",
    );
    const state = await open(QUESTION, text);
    expect(issuesOf(state)).toEqual([
      ["task.required_accuracy.outputs_to_match", "required-when", true],
    ]);
    const index = IssueIndex.of(state.model, state.report.issues);
    expect(index.at("task.required_accuracy.outputs_to_match")).toHaveLength(1);
    expect(index.countWithin(["task"])).toBe(1);
    expect(index.unplaced).toEqual([]);
  });

  it("reports every field that the aim requires, and reports each once", async () => {
    const text = withAim("explanation")
      .replace(/ {4}foil_set:[\s\S]*?(?= {4}compatibility)/, "")
      .replace("requested_relation: open", "requested_relation: both");
    expect(issuesOf(await open(QUESTION, text))).toEqual([
      ["subject.contrast.foil_set", "required-when", true],
    ]);
  });

  it("displays the issue of the fixture at its field and in the heading of its group", async () => {
    const state = await open(QUESTION, question);
    const index = IssueIndex.of(state.model, state.report.issues);
    expect(index.at("task.requested_relation").map(({ message }) => message)).toEqual([
      "This field is required when `task.epistemic_aim` equals `explanation`.",
    ]);
    expect([index.countWithin(["task"]), index.countWithin(["subject"])]).toEqual([1, 0]);
  });
});

describe("issues of the other bound fixtures", () => {
  it("merges the rejected alternatives of a placeholder into one issue", async () => {
    const name = "geonexus/glossary.yml";
    const state = await open(name, files.get(name) ?? "");
    expect(state.report.issues).toEqual([
      expect.objectContaining({
        id: "terms.natural-frequency.category",
        checker: "oneOf",
        message: "The value must be one of: `noun`, `verb`, `adjective`.",
      }),
    ]);
  });

  it.each(
    Object.keys(FIXTURE_BINDINGS).filter(
      (name) => !["gnomon/question.yml", "geonexus/glossary.yml"].includes(name),
    ),
  )("reports no issue on %s", async (name) => {
    const state = await open(name, files.get(name) ?? "");
    expect(state.report).toEqual({ issues: [], schemaIssues: [] });
  });
});
