// @vitest-environment happy-dom
/**
 * Outline panel in a simulated DOM: the entries of a form with their marks and counts, the move
 * requested by a click, the highlight of the focused field, the folding of entries, the
 * restriction to the entries with issues, and the search of the fields.
 */
import { cleanup, fireEvent, render } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, FormService, type FormReady } from "../../src/application";
import { OutlinePanel } from "../../src/adapters/obsidian/ui/outline/outline-panel";
import type { YamlPath } from "../../src/domain";
import { FileSchemaLoader, YamlDocumentParser } from "../../src/infrastructure";
import { MemoryFileSource } from "../support/fixture-vault";
import { element } from "../support/rendered-form";
import { createValidation } from "../support/validation";

const SCHEMA = `
type: object
required: [title, status]
properties:
  title: { type: string }
  status: { enum: [posed, answered] }
  subject:
    type: object
    properties:
      system: { type: string }
      count: { type: integer, minimum: 1 }
  rows:
    type: array
    items:
      type: object
      properties: { name: { type: string }, symbol: { type: string } }
`;

const TEXT = [
  "title: Pendulum",
  "subject:",
  "  system: pendulum",
  "  count: 0",
  "rows:",
  "  - name: bob",
  "  - symbol: x",
  "",
].join("\n");

afterEach(cleanup);

async function formOf(text = TEXT): Promise<FormReady> {
  const forms = new FormService(
    new YamlDocumentParser(),
    new FileSchemaLoader(new MemoryFileSource({ "s.yaml": SCHEMA })),
    createValidation(),
    () => ({ ...DEFAULT_SETTINGS, pathRules: [{ pattern: "*.yml", schema: "s.yaml" }] }),
  );
  const state = await forms.open("r.yml", text);
  if (state.status !== "form") throw new Error(`No form: ${state.status}`);
  return state;
}

async function renderOutline(focusedId: string | null = null) {
  const reveals: [YamlPath, boolean][] = [];
  const { container } = render(
    <OutlinePanel
      form={await formOf()}
      focusedId={focusedId}
      onReveal={(path, help) => reveals.push([path, help])}
    />,
  );
  return { container, reveals };
}

/** Names of the entries displayed, indented by two spaces per level of nesting. */
function displayed(container: Element): string[] {
  return Array.from(container.querySelectorAll(".ekphrasis-outline-entry"), (entry) => {
    let depth = -1;
    for (let node = entry.parentElement; node !== null; node = node.parentElement) {
      if (node.matches(".ekphrasis-outline-list")) depth += 1;
    }
    return `${"  ".repeat(depth)}${entry.querySelector(".ekphrasis-outline-name")?.textContent}`;
  });
}

describe("outline panel", () => {
  it("lists the entries in the order of the form, with the marks and counts of issues", async () => {
    const { container } = await renderOutline();
    expect(displayed(container)).toEqual([
      "title",
      "status",
      "subject",
      "  system",
      "  count",
      "rows",
      "  bob",
      "    name",
      "    symbol",
      "  #2",
      "    name",
      "    symbol",
    ]);
    const entry = (id: string): HTMLElement =>
      element(container, `li[data-path="${id}"] > .ekphrasis-outline-entry`);
    expect(entry("status").dataset["issue"]).toBe("missing");
    expect(entry("subject.count").dataset["issue"]).toBe("invalid");
    expect(entry("subject").querySelector(".ekphrasis-outline-count")?.textContent).toBe("1");
  });

  it("asks to move the form to the field of a clicked entry, and highlights the focused one", async () => {
    const { container, reveals } = await renderOutline("subject.system");
    const system = element(container, 'li[data-path="subject.system"] > .ekphrasis-outline-entry');
    expect(system.dataset["focused"]).toBe("true");
    fireEvent.click(element(system, ".ekphrasis-outline-name"));
    expect(reveals).toEqual([[["subject", "system"], false]]);
  });

  it("folds the entries of a section in the outline only", async () => {
    const { container } = await renderOutline();
    fireEvent.click(element(container, 'li[data-path="rows"] .ekphrasis-outline-fold'));
    expect(displayed(container)).not.toContain("  bob");
    expect(displayed(container)).toContain("rows");
  });

  it("restricts the outline to the entries with issues on demand", async () => {
    const { container } = await renderOutline();
    fireEvent.click(element(container, ".ekphrasis-outline-toggle input"));
    expect(displayed(container)).toEqual(["status", "subject", "  count"]);
  });

  it("searches the fields, and moves to a result with its instructions shown", async () => {
    const { container, reveals } = await renderOutline();
    const search = element<HTMLInputElement>(container, ".ekphrasis-outline-search");
    fireEvent.input(search, { target: { value: "name" } });
    const results = Array.from(
      container.querySelectorAll(".ekphrasis-outline-result"),
      (result) => result.textContent,
    );
    expect(results).toEqual(["namerows › bob", "namerows › #2"]);
    fireEvent.click(element(container, ".ekphrasis-outline-result"));
    fireEvent.keyDown(search, { key: "Enter" });
    expect(reveals).toEqual([
      [["rows", 0, "name"], true],
      [["rows", 0, "name"], true],
    ]);
  });

  it("states that no form is open", () => {
    const { container } = render(
      <OutlinePanel form={null} focusedId={null} onReveal={() => undefined} />,
    );
    expect(container.textContent).toBe("No form is open.");
  });
});
