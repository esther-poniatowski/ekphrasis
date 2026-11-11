// @vitest-environment happy-dom
/**
 * Optional corpus test of the Gnomon checker, run through the generic custom-checker interface,
 * on the project named by the environment variable `EKPHRASIS_CORPUS` and with the interpreter
 * named by `EKPHRASIS_CHECKER_PYTHON`, in whose environment Gnomon is installed. The corpus is read
 * and never modified.
 *
 * The test copies the folder of the first model record of the corpus into a temporary folder, and
 * appends an undeclared identifier to the expression of its first law there. The checker is then
 * configured as a user configures it: the built-in function `findings_log` runs `gnomon check` on
 * the folder of the instance and reads its SARIF findings log. The form must display the finding
 * on that identifier at the control of that expression, with the message, the rule, the result
 * class, the repair condition and the documentation target of the log that Gnomon writes for the
 * same folder; and a click on the field named by the summary must focus that control.
 */
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { cleanup, fireEvent } from "@testing-library/preact";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { parse, parseDocument } from "yaml";
import { CustomCheckerService } from "../../src/application";
import { planReveal, revealElement } from "../../src/adapters/obsidian/ui/reveal";
import {
  buildOutline,
  fieldTrail,
  IssueIndex,
  markOf,
  printFieldPath,
  restrictToIssues,
  type OutlineEntry,
  type YamlPath,
} from "../../src/domain";
import { PythonCheckerProcess } from "../../src/infrastructure";
import { DirectoryFileSource } from "../support/fixture-vault";
import {
  CHECKER_PYTHON_VARIABLE,
  GNOMON_CHECKER as GNOMON,
  GNOMON_REGISTRY as REGISTRY,
} from "../support/gnomon-checker";
import { element, renderForm } from "../support/rendered-form";
import { CORPUS_VARIABLE, readYamlFiles } from "../support/yaml-files";

const PLANTED = "ekphrasis_planted_symbol";
/** A check of one inquiry folder takes several seconds. */
const TIMEOUT_MS = 120_000;

const corpusRoot = process.env[CORPUS_VARIABLE];
const interpreter = process.env[CHECKER_PYTHON_VARIABLE];

interface PlantedModel {
  /** Vault path of the model record in the corpus. */
  readonly path: string;
  /** Text of the record with the planted identifier. */
  readonly text: string;
  /** Index of the law whose expression holds the planted identifier. */
  readonly law: number;
}

interface ConditionalQuestion {
  /** Vault path of the question record in the corpus. */
  readonly path: string;
  /** Text of an explanatory question with its required relation removed. */
  readonly text: string;
}

interface CleanQuestion {
  /** Vault path of one completed question in a worked inquiry. */
  readonly path: string;
  /** Unchanged text checked by Gnomon and rendered by Ekphrasis. */
  readonly text: string;
}

interface PendingAssessment {
  /** Vault path of one assessment carrying a pending researcher-authored verdict. */
  readonly path: string;
  readonly text: string;
  readonly verdict: YamlPath;
}

/** Printed paths in an outline, including the descendants of each entry. */
function outlinePaths(entries: readonly OutlineEntry[]): string[] {
  return entries.flatMap((entry) => [entry.id, ...outlinePaths(entry.children)]);
}

/** First model record of the corpus holding a law with an expression, with the identifier planted. */
function plantedModel(root: string): PlantedModel | null {
  for (const file of readYamlFiles(root)) {
    if (!/^_schema:\s*["']?gnomon:model@/m.test(file.text)) continue;
    const record = parse(file.text) as {
      laws?: readonly { expression?: unknown }[];
    } | null;
    const law = (record?.laws ?? []).findIndex((entry) => typeof entry.expression === "string");
    if (law < 0) continue;
    const document = parseDocument(file.text);
    const expression = String(document.getIn(["laws", law, "expression"]));
    document.setIn(["laws", law, "expression"], `${expression} + ${PLANTED}`);
    return { path: file.name, text: document.toString(), law };
  }
  return null;
}

/** First explanatory question, with the field selected by that aim removed. */
function conditionalQuestion(root: string): ConditionalQuestion | null {
  for (const file of readYamlFiles(root)) {
    if (!/^_schema:\s*["']?gnomon:question@/m.test(file.text)) continue;
    const record = parse(file.text) as {
      readonly task?: {
        readonly epistemic_aim?: unknown;
        readonly requested_relation?: unknown;
      };
    } | null;
    if (
      record?.task?.epistemic_aim !== "explanation" ||
      typeof record.task.requested_relation !== "string"
    ) {
      continue;
    }
    const document = parseDocument(file.text);
    document.deleteIn(["task", "requested_relation"]);
    return { path: file.name, text: document.toString() };
  }
  return null;
}

/** First completed question of a worked inquiry, whose folder Gnomon checks without findings. */
function cleanQuestion(root: string): CleanQuestion | null {
  const file = readYamlFiles(root).find(
    (candidate) =>
      candidate.name.startsWith("examples/") &&
      /^_schema:\s*["']?gnomon:question@/m.test(candidate.text),
  );
  return file === undefined ? null : { path: file.name, text: file.text };
}

/** First nested field named `verdict` whose authored value is `pending`. */
function pendingVerdict(value: unknown, path: YamlPath = []): YamlPath | null {
  if (Array.isArray(value)) {
    for (const [index, child] of value.entries()) {
      const found = pendingVerdict(child, [...path, index]);
      if (found !== null) return found;
    }
    return null;
  }
  if (value === null || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...path, key];
    if (key === "verdict" && child === "pending") return childPath;
    const found = pendingVerdict(child, childPath);
    if (found !== null) return found;
  }
  return null;
}

/** First assessment in a worked inquiry carrying a pending verdict. */
function pendingAssessment(root: string): PendingAssessment | null {
  for (const file of readYamlFiles(root)) {
    if (!file.name.startsWith("examples/")) continue;
    if (!/^_schema:\s*["']?gnomon:assessment@/m.test(file.text)) continue;
    const verdict = pendingVerdict(parse(file.text));
    if (verdict !== null) return { path: file.name, text: file.text, verdict };
  }
  return null;
}

/** SARIF result that Gnomon writes for the planted identifier, read from its own log. */
function gnomonResult(python: string, folder: string): Record<string, unknown> {
  const run = spawnSync(python, ["-m", "gnomon", "check", folder, "--format", "sarif"], {
    encoding: "utf8",
  });
  const log = JSON.parse(run.stdout) as {
    runs: { results: { partialFingerprints?: Record<string, string> }[] }[];
  };
  const result = log.runs[0]?.results.find((candidate) =>
    candidate.partialFingerprints?.["discriminator/v1"]?.includes(PLANTED),
  );
  if (result === undefined) throw new Error(`Gnomon reports no finding on ${PLANTED}.`);
  return result;
}

const ready = corpusRoot !== undefined && interpreter !== undefined;
const planted = ready ? plantedModel(corpusRoot) : null;
const conditional = ready ? conditionalQuestion(corpusRoot) : null;
const clean = ready ? cleanQuestion(corpusRoot) : null;
const pending = ready ? pendingAssessment(corpusRoot) : null;
const copy = mkdtempSync(join(tmpdir(), "ekphrasis-gnomon-"));

afterEach(cleanup);
afterAll(() => rmSync(copy, { recursive: true, force: true }));

describe.skipIf(!ready)(`Gnomon checker on the corpus named by ${CORPUS_VARIABLE}`, () => {
  it("separates a pending researcher verdict from validation findings", async () => {
    if (corpusRoot === undefined) return;
    expect(pending, "the corpus holds a pending assessment verdict").not.toBeNull();
    if (pending === null) return;
    const form = await renderForm(
      new DirectoryFileSource(corpusRoot),
      [],
      pending.path,
      pending.text,
      true,
      { schemaRegistry: REGISTRY },
    );
    const snapshot = form.session.snapshot.form;
    expect(snapshot, "the assessment opens as a form").not.toBeNull();
    if (snapshot === null) return;
    const unresolved = snapshot.report.issues.filter((item) => markOf(item) === "unresolved");
    expect(unresolved.map(({ id }) => id)).toContain(printFieldPath(pending.verdict));
    expect(form.container.querySelector(".ekphrasis-research-summary")?.textContent).toContain(
      "unresolved state",
    );
    const target = form.container.querySelector<HTMLButtonElement>(
      ".ekphrasis-research-summary .ekphrasis-field-link",
    );
    target?.click();
    expect(form.reveals).toContainEqual(pending.verdict);
  });

  it(
    "states the limited meaning of a clean Gnomon result",
    async () => {
      if (corpusRoot === undefined || interpreter === undefined) return;
      expect(clean, "the corpus holds a completed worked question").not.toBeNull();
      if (clean === null) return;
      const runner = new PythonCheckerProcess(interpreter, [GNOMON], TIMEOUT_MS);
      try {
        const checkers = new CustomCheckerService(
          () => [GNOMON],
          () => runner,
          (path) => join(corpusRoot, path),
        );
        const form = await renderForm(
          new DirectoryFileSource(corpusRoot),
          [],
          clean.path,
          clean.text,
          true,
          { schemaRegistry: REGISTRY },
          checkers,
        );
        const snapshot = form.session.snapshot.form;
        expect(snapshot, "the completed question opens as a form").not.toBeNull();
        if (snapshot === null) return;
        expect(snapshot.report.issues.filter((item) => item.checker === "gnomon")).toEqual([]);
        const cleanResult = snapshot.report.contexts.find(
          (item) => item.checker === "gnomon" && item.label === "Clean result",
        );
        expect(cleanResult).toMatchObject({
          checker: "gnomon",
          label: "Clean result",
          value: "structural and method conformance only",
        });
        expect(cleanResult?.description).toContain("no truth, warrant or acceptance");
        const contexts = Array.from(
          form.container.querySelectorAll<HTMLElement>(
            '.ekphrasis-checker-context[data-checker="gnomon"]',
          ),
        );
        const cleanContext = contexts.find((item) => item.textContent?.includes("Clean result"));
        expect(cleanContext?.textContent).toContain("structural and method conformance only");
        expect(cleanContext?.textContent).toContain("no truth, warrant or acceptance");
      } finally {
        await runner.close();
      }
    },
    TIMEOUT_MS * 2,
  );

  it(
    "reveals the absent field selected by the epistemic aim and marks it required",
    async () => {
      if (corpusRoot === undefined || interpreter === undefined) return;
      expect(conditional, "the corpus holds a complete explanatory question").not.toBeNull();
      if (conditional === null) return;
      const folder = join(copy, "conditional-inquiry");
      cpSync(join(corpusRoot, dirname(conditional.path)), folder, {
        recursive: true,
      });
      const file = join(folder, conditional.path.split("/").at(-1) ?? "");
      writeFileSync(file, conditional.text);

      const runner = new PythonCheckerProcess(interpreter, [GNOMON], TIMEOUT_MS);
      try {
        const checkers = new CustomCheckerService(
          () => [GNOMON],
          () => runner,
          (path) => (path === conditional.path ? file : join(corpusRoot, path)),
        );
        const form = await renderForm(
          new DirectoryFileSource(corpusRoot),
          [],
          conditional.path,
          conditional.text,
          true,
          { schemaRegistry: REGISTRY },
          checkers,
        );

        const snapshot = form.session.snapshot.form;
        expect(snapshot, "the explanatory question opens as a form").not.toBeNull();
        if (snapshot === null) return;
        expect(snapshot.report.contexts).toContainEqual(
          expect.objectContaining({
            checker: "gnomon",
            label: "Completion target",
            value: "question-typed",
            resultClass: "computed inquiry diagnosis",
          }),
        );
        const context = element(
          form.container,
          '.ekphrasis-checker-context[data-checker="gnomon"]',
        );
        expect(context.textContent).toContain("Completion target");
        expect(context.textContent).toContain("question-typed");
        const findings = snapshot.report.issues
          .filter((item) => item.checker === "gnomon")
          .map(({ id, missing, message }) => ({ id, missing, message }));
        expect(findings).toContainEqual(
          expect.objectContaining({
            id: "task.requested_relation",
            missing: true,
          }),
        );
        expect(snapshot.report.issues).toContainEqual(
          expect.objectContaining({
            id: "task.requested_relation",
            controlledBy: ["task", "epistemic_aim"],
          }),
        );
        expect(
          form.container.querySelector(
            '.ekphrasis-issue-control-group[data-controller="task.epistemic_aim"]',
          ),
        ).not.toBeNull();
        const relation = element(form.container, '[data-path="task.requested_relation"]');
        const issue = element(relation, '.ekphrasis-issue[data-checker="gnomon"]');
        expect(issue.classList.contains("mod-missing")).toBe(true);
        expect(relation.querySelector('[aria-label="required"]')).not.toBeNull();
        expect(
          relation.querySelector('button[aria-label="Discard Requested relation"]'),
        ).toBeNull();
        expect(conditional.text).not.toMatch(/^\s*requested_relation:/m);
        expect(form.session.text).toBe(conditional.text);

        const firstReport = snapshot.report;
        cleanup();
        const reopened = await renderForm(
          new DirectoryFileSource(corpusRoot),
          [],
          conditional.path,
          conditional.text,
          true,
          { schemaRegistry: REGISTRY },
          checkers,
        );
        const resumed = reopened.session.snapshot.form;
        expect(resumed, "the question reopens as a fresh form session").not.toBeNull();
        if (resumed === null) return;
        expect(resumed.report.contexts).toEqual(firstReport.contexts);
        expect(
          resumed.report.issues.map(({ id, missing, message }) => ({
            id,
            missing,
            message,
          })),
        ).toEqual(
          firstReport.issues.map(({ id, missing, message }) => ({
            id,
            missing,
            message,
          })),
        );
        expect(
          outlinePaths(
            restrictToIssues(
              buildOutline(resumed.model, IssueIndex.of(resumed.model, resumed.report.issues)),
            ),
          ),
        ).toContain("task.requested_relation");
        expect(reopened.container.textContent).toContain("question-typed");
        expect(
          reopened.container.querySelector('[data-path="task.requested_relation"]'),
        ).not.toBeNull();
        expect(reopened.session.text).toBe(conditional.text);
      } finally {
        await runner.close();
      }
    },
    TIMEOUT_MS * 2,
  );

  it(
    "displays a real Gnomon finding at its control, with its canonical metadata, and focuses it",
    async () => {
      if (corpusRoot === undefined || interpreter === undefined) return;
      expect(planted, "the corpus holds a model record with a law expression").not.toBeNull();
      if (planted === null) return;
      const folder = join(copy, "inquiry");
      cpSync(join(corpusRoot, dirname(planted.path)), folder, {
        recursive: true,
      });
      const file = join(folder, planted.path.split("/").at(-1) ?? "");
      writeFileSync(file, planted.text);
      const expected = gnomonResult(interpreter, folder);

      const runner = new PythonCheckerProcess(interpreter, [GNOMON], TIMEOUT_MS);
      try {
        const checkers = new CustomCheckerService(
          () => [GNOMON],
          () => runner,
          (path) => (path === planted.path ? file : join(corpusRoot, path)),
        );
        const form = await renderForm(
          new DirectoryFileSource(corpusRoot),
          [],
          planted.path,
          planted.text,
          true,
          { schemaRegistry: REGISTRY },
          checkers,
        );
        const snapshot = form.session.snapshot.form;
        expect(snapshot, "the planted model opens as a form").not.toBeNull();
        if (snapshot === null) return;

        const path = ["laws", planted.law, "expression"];
        const id = `laws[${planted.law}].expression`;
        const found = snapshot.report.issues.filter((item) => item.checker === "gnomon");
        const issue = found.find((item) => item.origin?.discriminator?.includes(PLANTED));
        const message = expected["message"] as { text: string };
        const properties = expected["properties"] as Record<string, string>;
        const location = (
          expected["locations"] as {
            physicalLocation: { artifactLocation: { uri: string } };
            logicalLocations: { name: string }[];
          }[]
        )[0];
        expect(issue).toMatchObject({
          path,
          id,
          severity: expected["level"],
          message: message.text,
          origin: {
            rule: expected["ruleId"],
            resultClass: properties["resultClass"],
            repairCondition: properties["repairCondition"],
            documentationTarget: properties["documentationTarget"],
            sourceFile: location?.physicalLocation.artifactLocation.uri,
            locus: location?.logicalLocations[0]?.name.split("#")[1],
            discriminator: (expected["partialFingerprints"] as Record<string, string>)[
              "discriminator/v1"
            ],
          },
        });

        const control = element(form.container, `[data-path="${id}"]`);
        const displayed = Array.from(
          control.querySelectorAll<HTMLElement>('.ekphrasis-issue[data-checker="gnomon"]'),
        ).find((item) => item.textContent?.includes(message.text));
        expect(displayed, `the finding displays at ${id}`).toBeDefined();
        expect(displayed?.textContent).toContain(String(expected["ruleId"]));
        expect(displayed?.textContent).toContain(properties["repairCondition"]);
        expect(displayed?.textContent).toContain(properties["documentationTarget"]);

        const trail = (fieldTrail(snapshot.model, path) ?? [id]).join(" › ");
        const link = Array.from(
          form.container.querySelectorAll<HTMLElement>(".ekphrasis-field-link"),
        ).find((button) => button.textContent === trail);
        expect(link, `the summary names ${trail}`).toBeDefined();
        form.folds.setAll(true);
        if (link !== undefined) fireEvent.click(link);
        expect(form.reveals.at(-1)).toEqual(path);
        const plan = planReveal(snapshot.model, path);
        expect(plan?.id).toBe(id);
        if (plan === null) return;
        form.folds.unfold(plan.unfold);
        expect(revealElement(form.container as HTMLElement, plan.id)).toBe(true);
        expect(
          element(form.container, `[data-path="${id}"]`).contains(document.activeElement),
        ).toBe(true);
      } finally {
        await runner.close();
      }
    },
    TIMEOUT_MS * 2,
  );
});
