// @vitest-environment happy-dom
/**
 * Findings of an instance checker, returned as a findings log locates them, displayed in the form:
 * each finding at the field that its pointer and its discriminator designate, with the guidance of
 * the tool; a click on the field named by the summary moves the form to that field and focuses its
 * control; a finding designating no field stays in the summary; and a result computed for a text
 * that a newer text replaced is discarded.
 */
import { cleanup, fireEvent } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CustomCheckerService,
  type CustomCheckerCall,
  type CustomCheckerIssue,
  type CustomCheckerItem,
  type CustomCheckerRunner,
} from "../../src/application";
import { planReveal, revealElement } from "../../src/adapters/obsidian/ui/reveal";
import { MemoryFileSource } from "../support/fixture-vault";
import { element, renderForm, type RenderedForm } from "../support/rendered-form";

const SCHEMA = [
  "type: object",
  "properties:",
  "  _schema: {const: 'tool:record@1'}",
  "  title: {type: string}",
  "  note: {type: string, title: Note}",
  "  laws:",
  "    type: array",
  "    items:",
  "      type: object",
  "      properties:",
  "        symbol: {type: string}",
  "        expression: {type: string}",
  "        source:",
  "          type: object",
  "          properties:",
  "            citation: {type: string}",
  "",
].join("\n");

const REGISTRY = [
  "schema_version: 1",
  "schemas:",
  "  'tool:record@1': record.schema.yaml",
  "",
].join("\n");

const TEXT = [
  "_schema: tool:record@1",
  "title: Relaxation",
  "laws:",
  "  - symbol: f",
  "    expression: x = y",
  "  - symbol: g",
  "    expression: u = zz",
  "    source:",
  "      citation: notes",
  "",
].join("\n");

const REGISTRATION = {
  name: "tool",
  module: "ekphrasis_findings",
  function: "findings_log",
  schemas: ["tool:*"],
  arguments: { command: ["-m", "tool", "check", "{folder}"] },
};

/** Finding of the tool on the expression of the law `g`, located as a keyed list locates it. */
const NESTED: CustomCheckerIssue = {
  message: "laws.expression -> zz",
  pointer: "/laws",
  discriminator: "g/expression/zz",
  severity: "error",
  rule: "area/unresolved",
  result_class: "method-conformance finding",
  repair_condition: "Every identifier resolves.",
  documentation_target: "docs/rules.md#^resolution",
  source_file: "inquiry/record.yml",
};

/** Finding on the citation of the source of `g`, two levels below the entry. */
const DEEPER: CustomCheckerIssue = {
  message: "unknown citation notes",
  pointer: "/laws",
  discriminator: "g/source/citation/notes",
  severity: "warning",
  rule: "area/citation",
};

/** Finding at a node that no field of the form designates. */
const UNMATCHED: CustomCheckerIssue = {
  message: "registry entry missing",
  pointer: "/registry/entries",
  severity: "error",
  rule: "area/registry",
};

const UNMATCHED_WARNING: CustomCheckerIssue = {
  message: "registry entry is provisional",
  pointer: "/registry/provisional",
  severity: "warning",
  rule: "area/provisional-registry",
};

/** Missing optional field selected by the current state of the record. */
const MISSING_OPTIONAL: CustomCheckerIssue = {
  message: "The current choice requires a note.",
  pointer: "/note",
  severity: "error",
  rule: "area/required-by-choice",
};

const CONTROLLED_NESTED: CustomCheckerIssue = {
  ...NESTED,
  controlled_by: "/title",
};

const CONTROLLED_OPTIONAL: CustomCheckerIssue = {
  ...MISSING_OPTIONAL,
  controlled_by: "/title",
};

/** Runner answering each call with the issues that `answer` gives for the title of the instance. */
function runner(answer: (title: string) => Promise<readonly CustomCheckerItem[]>) {
  const calls: CustomCheckerCall[] = [];
  const port: CustomCheckerRunner = {
    call: (input) => {
      calls.push(input);
      const instance = input.instance as { readonly title?: string };
      return answer(instance.title ?? "");
    },
    restart: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };
  return { port, calls };
}

async function render(
  answer: (title: string) => Promise<readonly CustomCheckerItem[]>,
): Promise<RenderedForm> {
  const { port } = runner(answer);
  const checkers = new CustomCheckerService(
    () => [REGISTRATION],
    () => port,
    (path) => `/vault/${path}`,
  );
  const files = new MemoryFileSource({
    "record.schema.yaml": SCHEMA,
    "schemas.yml": REGISTRY,
  });
  return renderForm(
    files,
    [],
    "inquiry/record.yml",
    TEXT,
    true,
    { schemaRegistry: "schemas.yml" },
    checkers,
  );
}

/** Performs the move requested by the last click, as the instance view performs it. */
function performReveal(form: RenderedForm): HTMLElement {
  const path = form.reveals.at(-1);
  const model = form.session.snapshot.form?.model;
  if (path === undefined || model === undefined) throw new Error("No move was requested.");
  const plan = planReveal(model, path);
  if (plan === null) throw new Error(`No field lies at ${JSON.stringify(path)}.`);
  form.folds.unfold(plan.unfold);
  const container = form.container as HTMLElement;
  expect(revealElement(container, plan.id)).toBe(true);
  return element(container, `[data-path="${plan.id}"]`);
}

/** Button of the summary naming the field whose trail ends with `name`. */
function summaryLink(container: Element, trail: string): HTMLElement {
  const links = Array.from(
    container.querySelectorAll<HTMLElement>(".ekphrasis-issue-summary .ekphrasis-field-link"),
  );
  const link = links.find((button) => button.textContent === trail);
  if (link === undefined) {
    const named = links.map((button) => button.textContent).join(", ");
    throw new Error(`The summary names no field ${trail}, but ${named}.`);
  }
  return link;
}

afterEach(cleanup);

describe("findings of an instance checker in the form", () => {
  it("states a checker context without counting it as an issue", async () => {
    const form = await render(() =>
      Promise.resolve([
        {
          kind: "context",
          label: "Completion target",
          value: "question-typed",
          description: "Checks completion through the typed question.",
          result_class: "computed inquiry diagnosis",
          documentation_target: "docs/scopes.md#question-typed",
        },
        {
          kind: "context",
          label: "Clean result",
          value: "structural and method conformance only",
          description: "The check establishes no truth, warrant or acceptance.",
          documentation_target: "docs/results.md",
        },
      ]),
    );

    const context = element(form.container, '.ekphrasis-checker-context[data-checker="tool"]');
    expect(element(context, ".ekphrasis-checker-context-label").textContent).toBe(
      "Completion target",
    );
    expect(element(context, ".ekphrasis-checker-context-value").textContent).toBe("question-typed");
    expect(context.textContent).toContain("Checks completion through the typed question.");
    expect(context.textContent).toContain("computed inquiry diagnosis");
    expect(context.textContent).toContain("docs/scopes.md#question-typed");
    const contexts = form.container.querySelectorAll(
      '.ekphrasis-checker-context[data-checker="tool"]',
    );
    expect(contexts).toHaveLength(2);
    expect(contexts[1]?.textContent).toContain("Clean result");
    expect(contexts[1]?.textContent).toContain("structural and method conformance only");
    expect(contexts[1]?.textContent).toContain("no truth, warrant or acceptance");
    expect(form.container.querySelector(".ekphrasis-issue-summary")).toBeNull();
  });

  it("reveals an absent optional field that a current finding requires", async () => {
    const form = await render(() => Promise.resolve([MISSING_OPTIONAL]));

    const note = element(form.container, '[data-path="note"]');
    expect(note.querySelector('[aria-label="required"]')).not.toBeNull();
    expect(note.querySelector('button[aria-label="Discard Note"]')).toBeNull();
    expect(element(note, '.ekphrasis-issue[data-checker="tool"]').textContent).toContain(
      "The current choice requires a note.",
    );
    const offered = Array.from(
      form.container.querySelectorAll<HTMLSelectElement>(
        'select[aria-label="Add an optional field"] option',
      ),
      (option) => option.textContent,
    );
    expect(offered).not.toContain("Note");
    expect(form.session.text).toBe(TEXT);
  });

  it("displays a finding at the field of a collection item, with the guidance of the tool", async () => {
    const form = await render(() => Promise.resolve([NESTED, DEEPER]));

    const field = element(form.container, '[data-path="laws[1].expression"]');
    const issue = element(field, '.ekphrasis-issue[data-checker="tool"]');
    expect(issue.classList.contains("mod-invalid")).toBe(true);
    expect(issue.textContent).toContain("laws.expression -> zz");
    expect(element(issue, ".ekphrasis-issue-rule").textContent).toBe(
      "area/unresolved · method-conformance finding",
    );
    expect(element(issue, ".ekphrasis-issue-repair").textContent).toBe(
      "Repair: Every identifier resolves.",
    );
    expect(element(issue, ".ekphrasis-issue-documentation").textContent).toBe(
      "Documentation: docs/rules.md#^resolution",
    );
    const deeper = element(form.container, '[data-path="laws[1].source.citation"]');
    expect(element(deeper, ".ekphrasis-issue").classList.contains("mod-warning")).toBe(true);
    expect(form.container.querySelector('[data-path="laws[0].expression"] .ekphrasis-issue')).toBe(
      null,
    );
  });

  it("moves the form to the field named by the summary and focuses its control", async () => {
    const form = await render(() => Promise.resolve([DEEPER]));
    form.folds.setAll(true);

    fireEvent.click(summaryLink(form.container, "laws › g › source › citation"));
    const target = performReveal(form);

    expect(form.reveals).toEqual([["laws", 1, "source", "citation"]]);
    expect(target.contains(document.activeElement)).toBe(true);
    expect(document.activeElement?.classList.contains("ekphrasis-control")).toBe(true);
  });

  it("groups findings of different marks under their controlling field", async () => {
    const form = await render(() =>
      Promise.resolve([CONTROLLED_NESTED, CONTROLLED_OPTIONAL, UNMATCHED_WARNING, UNMATCHED]),
    );

    const group = element(
      form.container,
      '.ekphrasis-issue-control-group[data-controller="title"]',
    );
    expect(element(group, ".ekphrasis-issue-controller").textContent).toBe("title");
    expect(
      Array.from(
        group.querySelectorAll(".ekphrasis-controlled-issue .ekphrasis-field-link"),
        (link) => link.textContent,
      ),
    ).toEqual(["Note", "laws › g › expression"]);
    expect(group.textContent).toContain("laws.expression -> zz");
    expect(group.textContent).toContain("The current choice requires a note.");
    expect(
      form.container.querySelector('[data-path="laws[1].expression"] .ekphrasis-issue'),
    ).not.toBeNull();
    expect(form.container.querySelector('[data-path="note"] .ekphrasis-issue')).not.toBeNull();
    expect(element(form.container, ".ekphrasis-path-messages").textContent).toContain(
      "registry entry missing",
    );
    const unplaced = form.container.querySelectorAll(
      ".ekphrasis-path-messages .ekphrasis-issue-message",
    );
    expect(unplaced[0]?.textContent).toContain("registry entry missing");
    expect(unplaced[1]?.textContent).toContain("registry entry is provisional");
  });

  it("keeps a finding designating no field in the summary, with the location of the tool", async () => {
    const form = await render(() => Promise.resolve([UNMATCHED]));

    const summary = element(form.container, ".ekphrasis-issue-summary");
    const unplaced = element(summary, ".ekphrasis-path-messages .ekphrasis-issue");
    expect(element(unplaced, ".ekphrasis-issue-path").textContent).toBe("registry.entries");
    expect(element(unplaced, ".ekphrasis-issue-locus").textContent).toBe(
      "Location: /registry/entries",
    );
    expect(summary.querySelectorAll(".ekphrasis-field-link")).toHaveLength(0);
  });

  it("discards the findings computed for a text that a newer text replaced", async () => {
    const pending = new Map<string, (issues: readonly CustomCheckerIssue[]) => void>();
    const form = await render((title) =>
      title === "Relaxation"
        ? Promise.resolve([])
        : new Promise((resolve) => pending.set(title, resolve)),
    );

    form.session.setText(TEXT.replace("Relaxation", "First"));
    const first = form.session.refresh("inquiry/record.yml");
    await vi.waitFor(() => expect(pending.has("First")).toBe(true));
    form.session.setText(TEXT.replace("Relaxation", "Second"));
    const second = form.session.refresh("inquiry/record.yml");
    await vi.waitFor(() => expect(pending.has("Second")).toBe(true));
    pending.get("Second")?.([DEEPER]);
    pending.get("First")?.([NESTED]);
    await Promise.all([first, second]);

    expect(form.container.querySelector('[data-path="laws[1].expression"] .ekphrasis-issue')).toBe(
      null,
    );
    expect(
      element(form.container, '[data-path="laws[1].source.citation"] .ekphrasis-issue').textContent,
    ).toContain("unknown citation notes");
  });
});
