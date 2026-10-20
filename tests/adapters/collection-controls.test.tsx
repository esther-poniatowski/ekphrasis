// @vitest-environment happy-dom
/**
 * Controls of the collection kinds, in a simulated DOM: rows and items added as drafts and
 * written by their first value, moved and removed by their actions, checkboxes inserting and
 * removing admitted values, entries added under a new identifier, and folded sections.
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
