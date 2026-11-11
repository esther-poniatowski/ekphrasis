// @vitest-environment happy-dom
/**
 * A list of scalars in a table cell, in a simulated DOM: each cell displays its items as one
 * summary, one token per item, rather than the section of a list. An editable summary opens the
 * control of the list, through which an item is edited. A read-only summary offers no control.
 * A list outside a table keeps its own section and controls.
 */
import { cleanup, fireEvent } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryFileSource } from "../support/fixture-vault";
import { editableControls, element, renderForm, type RenderedForm } from "../support/rendered-form";

const PROPERTIES = `
properties:
  rows:
    type: array
    x-kind: table
    items:
      type: object
      properties:
        name: { type: string }
        tags: { type: array, items: { type: string, maxLength: 5 } }
  tags: { type: array, items: { type: string } }
`;

const TEXT = [
  "rows:",
  "  - name: empty",
  "    tags: []",
  "  - name: one",
  "    tags: [a]",
  "  - name: many",
  '    tags: [a, "b, c", too-long]',
  "tags: [x, y]",
  "",
].join("\n");

afterEach(cleanup);

function renderCells(header = ""): Promise<RenderedForm> {
  return renderForm(
    new MemoryFileSource({ "s.yaml": `type: object\n${header}${PROPERTIES}` }),
    [{ pattern: "*.yml", schema: "s.yaml" }],
    "r.yml",
    TEXT,
  );
}

const cell = (container: Element, row: number): Element =>
  element(container, `td[data-path="rows[${row}].tags"]`);

const tokens = (target: Element): (string | null)[] =>
  Array.from(target.querySelectorAll(".ekphrasis-cell-item"), (token) => token.textContent);

describe("list in a table cell", () => {
  it("displays an empty list as the mark of an unfilled value, without a section", async () => {
    const { container } = await renderCells();
    const empty = cell(container, 0);
    expect(tokens(empty)).toEqual([]);
    expect(element(empty, ".ekphrasis-cell-empty").textContent).toBe("—");
    expect(empty.querySelector(".ekphrasis-group, .ekphrasis-add")).toBeNull();
  });

  it("displays one token per item, in the order of the file, without a section", async () => {
    const { container } = await renderCells();
    expect(tokens(cell(container, 1))).toEqual(["a"]);
    const many = cell(container, 2);
    expect(tokens(many)).toEqual(["a", "b, c", "too-long"]);
    expect(many.querySelector(".ekphrasis-group, .ekphrasis-add, input, textarea")).toBeNull();
  });

  it("marks the token of an item holding an issue, and lists the issue below the summary", async () => {
    const { container } = await renderCells();
    const many = cell(container, 2);
    const marks = Array.from(many.querySelectorAll(".ekphrasis-cell-item"), (token) =>
      token.getAttribute("data-issue"),
    );
    expect(marks).toEqual([null, null, "invalid"]);
    expect(element(many, ".ekphrasis-table-cell").getAttribute("data-issue")).toBe("invalid");
    expect(element(many, ".ekphrasis-issues").textContent).not.toBe("");
  });

  it("opens the control of the list from an editable summary, and saves an edited item", async () => {
    const { container, session } = await renderCells();
    const summary = element(cell(container, 1), '[role="button"][aria-label="Edit tags"]');
    expect(summary.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(summary);
    const input = element<HTMLTextAreaElement>(container, '[data-path="rows[1].tags[0]"] textarea');
    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: "z" } });
    fireEvent.blur(input);
    expect(session.text).toContain("  - name: one\n    tags: [z]\n");
    expect(tokens(cell(container, 1))).toEqual(["z"]);
    fireEvent.keyDown(element(cell(container, 1), ".ekphrasis-cell-list"), { key: "Enter" });
    expect(cell(container, 1).querySelector(".ekphrasis-group")).toBeNull();
  });

  it("offers no control in a read-only cell, even when its summary is activated", async () => {
    const { container } = await renderCells("readOnly: true\n");
    const many = cell(container, 2);
    const summary = element(many, ".ekphrasis-cell-list");
    expect(summary.getAttribute("role")).toBeNull();
    expect(summary.getAttribute("aria-readonly")).toBe("true");
    fireEvent.click(summary);
    fireEvent.keyDown(summary, { key: "Enter" });
    expect(tokens(many)).toEqual(["a", "b, c", "too-long"]);
    expect(many.querySelector(".ekphrasis-group, .ekphrasis-add")).toBeNull();
    expect(editableControls(container)).toEqual([]);
  });

  it("keeps the section and the controls of a list outside a table", async () => {
    const { container } = await renderCells();
    const tags = element(container, 'section[data-path="tags"]');
    expect(tags.querySelectorAll("textarea, input").length).toBe(2);
    expect(tags.querySelector(".ekphrasis-add")).not.toBeNull();
    expect(tags.querySelector(".ekphrasis-cell-list")).toBeNull();
  });
});
