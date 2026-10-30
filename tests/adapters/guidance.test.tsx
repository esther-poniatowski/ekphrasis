// @vitest-environment happy-dom
/**
 * Guidance of the author in a simulated DOM: the instructions and the examples of a field shown
 * and hidden by its help button, by a click or by the keyboard, those of a column of a table under
 * the header of the table, the values of kind `markdown-line`, `markdown` and `latex` displayed
 * rendered and edited after a click, the alignment of formulas, and the move of the form to a
 * field.
 */
import { cleanup, fireEvent } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { planReveal, revealElement } from "../../src/adapters/obsidian/ui/reveal";
import { MemoryFileSource } from "../support/fixture-vault";
import { element, renderForm, type RenderedForm } from "../support/rendered-form";

const SCHEMA = `
type: object
description: Fill the record before any answer.
properties:
  title:
    type: string
    description: The name of the question, in **one** line.
    examples: [Onset of oscillation, Decay to rest]
  summary: { type: string, x-kind: markdown-line }
  prose: { type: string, x-kind: markdown }
  formula: { type: string, x-kind: latex }
  note: { type: string, x-kind: markdown-line }
  rows:
    type: array
    items:
      type: object
      properties:
        name: { type: string, description: The name of the row. }
        symbol: { type: string }
  subject:
    type: object
    x-collapsed: true
    description: What the question is about.
    properties:
      system: { type: string, x-kind: label }
`;

const TEXT = [
  "title: Pendulum",
  "summary: A *short* line",
  "prose: |",
  "  First paragraph.",
  "formula: '\\alpha'",
  "rows:",
  "  - name: bob",
  "subject:",
  "  system: pendulum",
  "",
].join("\n");

afterEach(cleanup);

function renderGuided(text = TEXT): Promise<RenderedForm> {
  return renderForm(
    new MemoryFileSource({ "s.yaml": SCHEMA }),
    [{ pattern: "*.yml", schema: "s.yaml" }],
    "r.yml",
    text,
  );
}

const row = (container: Element, id: string): HTMLElement =>
  element(container, `.ekphrasis-field[data-path="${id}"], section[data-path="${id}"]`);

describe("instructions on demand", () => {
  it("shows the instructions and the examples of a field at a click, and hides them at a second", async () => {
    const { container } = await renderGuided();
    const title = row(container, "title");
    const button = element(title, ".ekphrasis-help-button");
    expect(title.querySelector(".ekphrasis-help")).toBeNull();
    fireEvent.click(button);
    const help = element(row(container, "title"), ".ekphrasis-help");
    expect(element(help, ".ekphrasis-help-text").textContent).toBe(
      "The name of the question, in **one** line.",
    );
    expect(Array.from(help.querySelectorAll("li code"), (code) => code.textContent)).toEqual([
      "Onset of oscillation",
      "Decay to rest",
    ]);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(element(row(container, "title"), ".ekphrasis-help-button"));
    expect(row(container, "title").querySelector(".ekphrasis-help")).toBeNull();
  });

  it("shows and hides the instructions by the keys Enter and Space on the focused help button", async () => {
    const { container } = await renderGuided();
    const button = (): HTMLButtonElement =>
      element<HTMLButtonElement>(row(container, "title"), ".ekphrasis-help-button");
    const shown = (): boolean => row(container, "title").querySelector(".ekphrasis-help") !== null;
    button().focus();
    expect(container.ownerDocument.activeElement).toBe(button());
    fireEvent.keyDown(button(), { key: "Enter" });
    expect(shown()).toBe(true);
    fireEvent.keyDown(button(), { key: "Enter" });
    expect(shown()).toBe(false);
    fireEvent.keyDown(button(), { key: " " });
    expect(shown()).toBe(true);
    // A key held down repeats its event, which must not toggle the instructions again.
    fireEvent.keyDown(button(), { key: " ", repeat: true });
    expect(shown()).toBe(true);
    // Each handled key cancels the activation of the button by the browser, which would toggle
    // the instructions a second time.
    expect(fireEvent.keyDown(button(), { key: "Enter" })).toBe(false);
    expect(shown()).toBe(false);
  });

  it("offers no help button to a field without instructions or examples", async () => {
    const { container } = await renderGuided();
    expect(row(container, "summary").querySelector(".ekphrasis-help-button")).toBeNull();
  });

  it("shows the instructions of a folded group below its heading", async () => {
    const { container } = await renderGuided();
    fireEvent.click(element(row(container, "subject"), ".ekphrasis-help-button"));
    const subject = row(container, "subject");
    expect(subject.dataset["folded"]).toBe("true");
    expect(element(subject, ".ekphrasis-help").textContent).toContain(
      "What the question is about.",
    );
  });

  it("shows the instructions of a column under the header of its table", async () => {
    const { container } = await renderGuided();
    const table = row(container, "rows");
    expect(table.querySelectorAll("th .ekphrasis-help-button")).toHaveLength(1);
    fireEvent.click(element(table, "th .ekphrasis-help-button"));
    const help = element(row(container, "rows"), ".ekphrasis-help");
    expect(element(help, ".ekphrasis-help-title").textContent).toBe("name");
    expect(help.textContent).toContain("The name of the row.");
  });

  it("shows the instructions of the root beside the title of the form", async () => {
    const { container } = await renderGuided();
    const header = element(container, ".ekphrasis-form-header");
    expect(header.querySelector(".ekphrasis-help")).toBeNull();
    fireEvent.click(element(header, ".ekphrasis-help-button"));
    expect(element(container, ".ekphrasis-form-header .ekphrasis-help").textContent).toBe(
      "Fill the record before any answer.",
    );
  });
});

describe("every instruction at once", () => {
  const shownHelp = (container: Element): (string | undefined)[] =>
    Array.from(
      container.querySelectorAll<HTMLElement>(".ekphrasis-help"),
      (panel) => panel.dataset["help"],
    );

  it("shows the instructions of every field, without unfolding a folded section", async () => {
    const { container, help } = await renderGuided();
    help.setAll(true);
    expect(help.allShown).toBe(true);
    expect(shownHelp(container)).toHaveLength(4);
    expect(row(container, "subject").dataset["folded"]).toBe("true");
    expect(element(row(container, "subject"), ".ekphrasis-help").textContent).toContain(
      "What the question is about.",
    );
    expect(element(container, ".ekphrasis-form-header .ekphrasis-help").textContent).toBe(
      "Fill the record before any answer.",
    );
  });

  it("lets a help button hide one field after every instruction is shown, and hides them all again", async () => {
    const { container, help } = await renderGuided();
    help.setAll(true);
    fireEvent.click(element(row(container, "title"), ".ekphrasis-help-button"));
    expect(row(container, "title").querySelector(".ekphrasis-help")).toBeNull();
    expect(shownHelp(container)).toHaveLength(3);
    help.setAll(false);
    expect(help.allShown).toBe(false);
    expect(shownHelp(container)).toEqual([]);
    fireEvent.click(element(row(container, "title"), ".ekphrasis-help-button"));
    expect(shownHelp(container)).toHaveLength(1);
  });

  it("hides every instruction again for a newly opened file", async () => {
    const { container, help } = await renderGuided();
    help.setAll(true);
    help.reset();
    expect(help.allShown).toBe(false);
    // The reset displays nothing by itself; the next click displays the form again.
    fireEvent.click(element(row(container, "title"), ".ekphrasis-help-button"));
    expect(shownHelp(container)).toHaveLength(1);
  });
});

describe("rendered values", () => {
  it("displays the values of the rendered kinds through the renderer, without an editor", async () => {
    const { container } = await renderGuided();
    for (const [id, kind, text] of [
      ["summary", "markdown-line", "A *short* line"],
      ["prose", "markdown", "First paragraph.\n"],
      ["formula", "latex", "\\alpha"],
    ] as const) {
      const field = row(container, id);
      const rendered = element(field, ".ekphrasis-rendered");
      expect([rendered.dataset["kind"], rendered.textContent]).toEqual([kind, text]);
      expect(field.querySelector("input, textarea")).toBeNull();
    }
  });

  it("aligns a formula as its keyword x-align sets it, in a field and in a cell", async () => {
    const schema = [
      "type: object",
      "properties:",
      "  centred: { type: string, x-kind: latex }",
      "  left: { type: string, x-kind: latex, x-align: left }",
      "  rows:",
      "    type: array",
      "    items:",
      "      type: object",
      "      properties:",
      "        expression: { type: string, x-kind: latex, x-align: left }",
      "        name: { type: string }",
      "",
    ].join("\n");
    const { container } = await renderForm(
      new MemoryFileSource({ "s.yaml": schema }),
      [{ pattern: "*.yml", schema: "s.yaml" }],
      "r.yml",
      "centred: a\nleft: b\nrows:\n  - expression: c\n    name: d\n",
    );
    const align = (selector: string): string | undefined =>
      element(container, `${selector} .ekphrasis-rendered`).dataset["align"];
    expect([
      align('.ekphrasis-field[data-path="centred"]'),
      align('.ekphrasis-field[data-path="left"]'),
      align('td[data-path="rows[0].expression"]'),
    ]).toEqual(["center", "left", "left"]);
  });

  it("displays the editor of an empty value at once, with its placeholder", async () => {
    const { container } = await renderGuided();
    const input = element<HTMLTextAreaElement>(row(container, "note"), "textarea");
    expect(input.placeholder).toBe("—");
  });

  it("opens the editor at the focus of the rendered value, and renders the committed text", async () => {
    const { container, session } = await renderGuided();
    fireEvent.focus(element(row(container, "summary"), ".ekphrasis-rendered"));
    const input = element<HTMLTextAreaElement>(row(container, "summary"), "textarea");
    expect(input.value).toBe("A *short* line");
    expect(input.ownerDocument.activeElement).toBe(input);
    fireEvent.input(input, { target: { value: "A *new* line" } });
    fireEvent.blur(input);
    expect(session.text).toContain("summary: A *new* line\n");
    expect(element(row(container, "summary"), ".ekphrasis-rendered").textContent).toBe(
      "A *new* line",
    );
  });

  it("opens a multi-line editor for the kind markdown", async () => {
    const { container } = await renderGuided();
    fireEvent.focus(element(row(container, "prose"), ".ekphrasis-rendered"));
    expect(element<HTMLTextAreaElement>(row(container, "prose"), "textarea").value).toBe(
      "First paragraph.\n",
    );
  });
});

describe("move of the form to a field", () => {
  it("unfolds the sections containing the field, and focuses its control", async () => {
    const { container, session, folds } = await renderGuided();
    const form = session.snapshot.form;
    if (form === null) throw new Error("No form.");
    const plan = planReveal(form.model, ["subject", "system"]);
    expect(plan).toMatchObject({ id: "subject.system" });
    folds.unfold(plan?.unfold ?? []);
    expect(revealElement(container as HTMLElement, "subject.system")).toBe(true);
    const input = element<HTMLInputElement>(row(container, "subject.system"), "input");
    expect(input.ownerDocument.activeElement).toBe(input);
    expect(row(container, "subject.system").dataset["revealed"]).toBe("true");
  });

  it("names the column of a cell as its help key, and refuses an unknown path", async () => {
    const { session } = await renderGuided();
    const form = session.snapshot.form;
    if (form === null) throw new Error("No form.");
    const rows = form.model.root.kind === "group" ? form.model.root.children[5] : undefined;
    expect(planReveal(form.model, ["rows", 0, "name"])?.helpKey).toBe(`${rows?.uid}#name`);
    expect(planReveal(form.model, ["absent"])).toBeNull();
  });
});
