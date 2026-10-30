// @vitest-environment happy-dom
/**
 * Outline panel in a simulated DOM: the entries of a form with their marks and counts, the move
 * requested by a click, the highlight of the focused field, the folding of entries, one at a time
 * or all at once, the restriction to the entries with issues, the search of the fields with its
 * clear button, and the classes of the core outline of Obsidian, which draw the panel.
 */
import { cleanup, fireEvent, render } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, FormService, type FormReady } from "../../src/application";
import { NO_ICONS } from "../../src/adapters/obsidian/ui/icon";
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
  tags: { type: array, items: { type: string } }
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
  "tags: [x, y]",
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
      paintIcon={NO_ICONS}
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
      "tags",
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

  it("omits the items of a list of scalars, so its entry folds nothing", async () => {
    const { container } = await renderOutline();
    const tags = element(container, 'li[data-path="tags"]');
    expect(tags.querySelector(".ekphrasis-outline-fold, .tree-item-children")).toBeNull();
    expect(container.querySelector('li[data-path="tags[0]"]')).toBeNull();
  });

  it("draws the entries as the items of the tree of the core outline", async () => {
    const { container } = await renderOutline("subject.system");
    const rows = element(container, 'li[data-path="rows"]');
    expect(rows.classList.contains("tree-item")).toBe(true);
    expect(element(rows, ":scope > .tree-item-self").classList).toContain("mod-collapsible");
    const triangle = element(rows, ":scope > .tree-item-self > .collapse-icon [data-icon]");
    expect(triangle.dataset["icon"]).toBe("right-triangle");
    expect(element(rows, ":scope > .tree-item-children").matches("ul")).toBe(true);
    const system = element(container, 'li[data-path="subject.system"] > .tree-item-self');
    expect(system.classList).toContain("is-active");
    expect(element(system, ".tree-item-inner").textContent).toBe("system");
  });

  it("asks to move the form to the field of a clicked entry, and highlights the focused one", async () => {
    const { container, reveals } = await renderOutline("subject.system");
    const system = element(container, 'li[data-path="subject.system"] > .ekphrasis-outline-entry');
    expect(system.dataset["focused"]).toBe("true");
    fireEvent.click(element(system, ".ekphrasis-outline-name"));
    expect(reveals).toEqual([[["subject", "system"], false]]);
  });

  it("folds the entries of a section in the outline only, without moving the form", async () => {
    const { container, reveals } = await renderOutline();
    fireEvent.click(element(container, 'li[data-path="rows"] .ekphrasis-outline-fold'));
    expect(displayed(container)).not.toContain("  bob");
    expect(displayed(container)).toContain("rows");
    expect(element(container, 'li[data-path="rows"]').classList).toContain("is-collapsed");
    expect(reveals).toEqual([]);
  });

  it("moves the form to the field of an entry from its line and by the key Enter", async () => {
    const { container, reveals } = await renderOutline();
    const title = element(container, 'li[data-path="title"] > .tree-item-self');
    fireEvent.click(title);
    fireEvent.keyDown(element(title, ".tree-item-inner"), { key: "Enter" });
    expect(reveals).toEqual([
      [["title"], false],
      [["title"], false],
    ]);
  });

  it("folds and unfolds every entry of the outline at once", async () => {
    const { container } = await renderOutline();
    fireEvent.click(element(container, 'button[aria-label="Collapse all"]'));
    expect(displayed(container)).toEqual(["title", "status", "subject", "tags", "rows"]);
    fireEvent.click(element(container, 'li[data-path="rows"] .ekphrasis-outline-fold'));
    expect(displayed(container)).toEqual([
      "title",
      "status",
      "subject",
      "tags",
      "rows",
      "  bob",
      "  #2",
    ]);
    fireEvent.click(element(container, 'button[aria-label="Expand all"]'));
    expect(displayed(container)).toHaveLength(13);
  });

  it("clears the search by its cross, and lists the entries again", async () => {
    const { container } = await renderOutline();
    expect(container.querySelector(".ekphrasis-outline-clear")).toBeNull();
    const search = element<HTMLInputElement>(container, ".ekphrasis-outline-search");
    fireEvent.input(search, { target: { value: "name" } });
    expect(container.querySelector(".ekphrasis-outline-entry")).toBeNull();
    const clear = element(container, ".ekphrasis-outline-clear");
    expect(clear.getAttribute("aria-label")).toBe("Clear the search");
    fireEvent.click(clear);
    expect(search.value).toBe("");
    expect(search.ownerDocument.activeElement).toBe(search);
    expect(container.querySelector(".ekphrasis-outline-clear")).toBeNull();
    expect(displayed(container)).toHaveLength(13);
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
      <OutlinePanel form={null} focusedId={null} onReveal={() => undefined} paintIcon={NO_ICONS} />,
    );
    expect(container.textContent).toBe("No form is open.");
  });
});
