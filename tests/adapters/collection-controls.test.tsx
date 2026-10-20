// @vitest-environment happy-dom
/**
 * Controls of the collection kinds, in a simulated DOM: rows and items added as drafts and
 * written by their first value, moved and removed by their actions, checkboxes inserting and
 * removing admitted values, entries added under a new identifier, folded sections, and the
 * switch of an alternative.
 */
import { cleanup, fireEvent } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryFileSource } from "../support/fixture-vault";
import { element, renderForm, type RenderedForm } from "../support/rendered-form";

const SCHEMA = `
type: object
properties:
  tags: { type: array, items: { type: string } }
  rows:
    type: array
    items:
      type: object
      required: [name]
      properties: { name: { type: string }, symbol: { type: string } }
  kinds: { type: array, uniqueItems: true, items: { enum: [a, b, c] } }
  terms:
    type: object
    additionalProperties:
      type: object
      properties:
        label: { type: string }
        frames: { type: array, items: { type: string } }
  notes:
    type: object
    x-collapsed: true
    properties: { text: { type: string } }
`;

const TEXT = [
  "tags: [x, y]",
  "rows:",
  "  - name: a",
  "kinds: [a, c]",
  "terms:",
  "  b-term:",
  "    label: B",
  "notes:",
  "  text: hidden",
  "",
].join("\n");

afterEach(cleanup);

function renderCollections(text = TEXT): Promise<RenderedForm> {
  return renderForm(
    new MemoryFileSource({ "s.yaml": SCHEMA }),
    [{ pattern: "*.yml", schema: "s.yaml" }],
    "r.yml",
    text,
  );
}

/** Types `value` into `input`, then leaves it, so its control commits. */
function type(input: HTMLInputElement, value: string): void {
  fireEvent.focus(input);
  fireEvent.input(input, { target: { value } });
  fireEvent.blur(input);
}

const button = (container: Element, label: string): HTMLButtonElement =>
  element<HTMLButtonElement>(container, `button[aria-label="${label}"]`);

describe("table", () => {
  it("adds a row as a draft, written by its first cell, in the same input", async () => {
    const { container, session } = await renderCollections();
    fireEvent.click(element(container, '[data-path="rows"] .ekphrasis-add'));
    const input = element<HTMLInputElement>(container, '[data-path="rows[1].name"] input');
    expect(session.text).not.toContain("- name: b");
    type(input, "b");
    expect(session.text).toContain("rows:\n  - name: a\n  - name: b\n");
    expect(element(container, '[data-path="rows[1].name"] input')).toBe(input);
  });

  it("removes a row by its action", async () => {
    const { container, session } = await renderCollections();
    fireEvent.click(button(element(container, '[data-path="rows"]'), "Remove #1"));
    expect(session.text).toContain("rows: []\n");
  });
});

describe("list", () => {
  it("moves an item down and removes an item, keeping the flow form", async () => {
    const { container, session } = await renderCollections();
    const tags = element(container, '[data-path="tags"]');
    fireEvent.click(button(tags, "Move #1 down"));
    expect(session.text).toContain("tags: [y, x]\n");
    fireEvent.click(button(element(container, '[data-path="tags"]'), "Remove #2"));
    expect(session.text).toContain("tags: [y]\n");
  });
});

describe("checkboxes", () => {
  it("inserts a checked value in the order of the admitted values, and removes an unchecked one", async () => {
    const { container, session } = await renderCollections();
    const boxes = (): HTMLInputElement[] =>
      Array.from(container.querySelectorAll<HTMLInputElement>('[data-path="kinds"] input'));
    expect(boxes().map((box) => box.checked)).toEqual([true, false, true]);
    const [, b] = boxes();
    if (b === undefined) throw new Error("No checkbox for b.");
    fireEvent.click(b);
    expect(session.text).toContain("kinds: [a, b, c]\n");
    const [a] = boxes();
    if (a === undefined) throw new Error("No checkbox for a.");
    fireEvent.click(a);
    expect(session.text).toContain("kinds: [b, c]\n");
  });
});

describe("keyed records", () => {
  it("adds an entry under a new identifier, written by its first value", async () => {
    const { container, session } = await renderCollections();
    const terms = element(container, '[data-path="terms"]');
    const key = element<HTMLInputElement>(terms, ".ekphrasis-key-adder input");
    fireEvent.input(key, { target: { value: "a-term" } });
    fireEvent.click(element(terms, ".ekphrasis-key-adder button"));
    type(element<HTMLInputElement>(container, '[data-path="terms.a-term.label"] input'), "A");
    expect(session.text).toContain("terms:\n  a-term:\n    label: A\n  b-term:\n");
  });

  it("refuses an identifier already present", async () => {
    const { container } = await renderCollections();
    const terms = element(container, '[data-path="terms"]');
    fireEvent.input(element(terms, ".ekphrasis-key-adder input"), {
      target: { value: "b-term" },
    });
    expect(element<HTMLButtonElement>(terms, ".ekphrasis-key-adder button").disabled).toBe(true);
    expect(terms.textContent).toContain("The identifier b-term is already present.");
  });
});

describe("alternatives", () => {
  const schema = `
type: object
properties:
  source:
    oneOf:
      - { title: Book, required: [isbn], properties: { isbn: { type: string }, year: { type: integer } } }
      - { title: Paper, required: [doi], properties: { doi: { type: string }, year: { type: integer } } }
`;

  /** Renders `text`, chooses the alternative *Paper*, and lets the confirmation resolve. */
  async function choosePaper(text: string, confirm: boolean): Promise<RenderedForm> {
    const form = await renderForm(
      new MemoryFileSource({ "s.yaml": schema }),
      [{ pattern: "*.yml", schema: "s.yaml" }],
      "r.yml",
      text,
      confirm,
    );
    fireEvent.change(selector(form), { target: { value: "1" } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    return form;
  }

  const selector = ({ container }: RenderedForm): HTMLSelectElement =>
    element<HTMLSelectElement>(container, '[data-path="source"] select');

  it("keeps the previous alternative and the file when the confirmation is cancelled", async () => {
    const text = "source:\n  isbn: 978-0\n  year: 2020\n";
    const form = await choosePaper(text, false);
    expect(form.confirmations).toEqual([{ alternative: "Paper", fields: ["isbn"] }]);
    expect(form.session.text).toBe(text);
    expect(selector(form).value).toBe("0");
    expect(form.container.querySelector('[data-path="source.isbn"]')).not.toBeNull();
  });

  it("removes the keys of the previous alternative only once confirmed", async () => {
    const form = await choosePaper("source:\n  isbn: 978-0\n  year: 2020\n", true);
    expect(form.session.text).toBe("source:\n  year: 2020\n");
    expect(selector(form).value).toBe("1");
    expect(form.container.querySelector('[data-path="source.doi"]')).not.toBeNull();
    expect(form.container.querySelector('[data-path="source.isbn"]')).toBeNull();
  });

  it("switches without a confirmation when the removed keys hold no value", async () => {
    const form = await choosePaper("source:\n  isbn:\n  year: 2020\n", false);
    expect(form.confirmations).toEqual([]);
    expect(form.session.text).toBe("source:\n  year: 2020\n");
    expect(selector(form).value).toBe("1");
  });
});

describe("folded sections", () => {
  it("folds a section declared collapsed, and toggles a section by its heading", async () => {
    const { container } = await renderCollections();
    expect(element(container, '[data-path="notes"]').dataset["folded"]).toBe("true");
    expect(container.querySelector('[data-path="notes.text"]')).toBeNull();
    fireEvent.click(button(container, "Expand notes"));
    expect(container.querySelector('[data-path="notes.text"]')).not.toBeNull();
    fireEvent.click(button(container, "Collapse tags"));
    expect(container.querySelector('[data-path="tags[0]"]')).toBeNull();
  });

  it("collapses and expands every section at once", async () => {
    const { container, folds } = await renderCollections();
    folds.setAll(true);
    const sections = Array.from(container.querySelectorAll<HTMLElement>("section"));
    expect(sections.length).toBeGreaterThan(3);
    expect(sections.every((section) => section.dataset["folded"] === "true")).toBe(true);
    folds.setAll(false);
    expect(container.querySelector('[data-path="notes.text"]')).not.toBeNull();
  });
});
