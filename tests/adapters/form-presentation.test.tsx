// @vitest-environment happy-dom
/**
 * Presentation of the form in a simulated DOM: the icon of the kind of each field in its label,
 * the inputs that wrap a long single-line value while the file keeps it on one line, the
 * descriptions of the options of a choice shown with the instructions of the field, and the
 * collections left empty without a message.
 */
import { cleanup, fireEvent } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { KIND_ICONS } from "../../src/adapters/obsidian/ui/icon";
import { withoutLineBreaks } from "../../src/adapters/obsidian/ui/controls/wrapping-input";
import { MemoryFileSource } from "../support/fixture-vault";
import { element, renderForm, type RenderedForm } from "../support/rendered-form";

const SCHEMA = `
type: object
properties:
  code: { type: string, x-kind: label }
  title: { type: string }
  summary: { type: string, x-kind: markdown-line }
  formula: { type: string, x-kind: latex }
  count: { type: integer }
  done: { type: boolean }
  status:
    oneOf:
      - { const: posed, title: Posed, description: The question awaits an answer. }
      - { const: answered, title: Answered, description: An answer is recorded. }
      - { const: dropped }
  tags: { type: array, items: { type: string } }
  rows:
    type: array
    items:
      type: object
      properties:
        name: { type: string }
        state:
          oneOf:
            - { const: open, description: The row is being filled. }
            - { const: closed, description: The row is complete. }
  terms:
    type: object
    additionalProperties:
      type: object
      properties:
        label: { type: string }
        frames: { type: array, items: { type: string } }
`;

const TEXT = [
  "code: q1",
  "title: Pendulum",
  "summary:",
  "formula:",
  "count: 2",
  "done: false",
  "status: posed",
  "tags: []",
  "rows: []",
  "terms: {}",
  "",
].join("\n");

afterEach(cleanup);

function renderPresented(text = TEXT): Promise<RenderedForm> {
  return renderForm(
    new MemoryFileSource({ "s.yaml": SCHEMA }),
    [{ pattern: "*.yml", schema: "s.yaml" }],
    "r.yml",
    text,
  );
}

const row = (container: Element, id: string): HTMLElement =>
  element(container, `.ekphrasis-field[data-path="${id}"], section[data-path="${id}"]`);

describe("rows of fields", () => {
  it("opens the label of each field with the icon of its kind, before its name", async () => {
    const { container } = await renderPresented();
    const icons = Object.fromEntries(
      ["code", "title", "count", "done", "status", "tags", "rows", "terms"].map((id) => {
        const label = element(row(container, id), ".ekphrasis-field-label");
        const icon = element(label, ":scope > .ekphrasis-field-icon");
        expect(icon.nextElementSibling?.classList).toContain("ekphrasis-field-name");
        return [id, icon.dataset["icon"]];
      }),
    );
    expect(icons).toEqual({
      code: KIND_ICONS.label,
      title: KIND_ICONS.text,
      count: KIND_ICONS.number,
      done: KIND_ICONS.boolean,
      status: KIND_ICONS.choice,
      tags: KIND_ICONS.list,
      rows: KIND_ICONS.table,
      terms: KIND_ICONS["keyed-records"],
    });
  });

  it("closes the label of a field with instructions by its help button", async () => {
    const { container } = await renderPresented();
    const label = element(row(container, "status"), ".ekphrasis-field-label");
    expect(label.lastElementChild?.classList).toContain("ekphrasis-help-button");
  });
});

describe("wrapped single-line values", () => {
  it("edits the kinds text, markdown-line and latex in an input of one row, and the others in an input", async () => {
    const { container } = await renderPresented();
    for (const id of ["title", "summary", "formula"]) {
      const area = element<HTMLTextAreaElement>(row(container, id), "textarea");
      expect([
        id,
        area.getAttribute("rows"),
        area.classList.contains("ekphrasis-wrapping"),
      ]).toEqual([id, "1", true]);
    }
    for (const id of ["code", "count"]) {
      expect(row(container, id).querySelector("textarea")).toBeNull();
      expect(row(container, id).querySelector("input[type='text']")).not.toBeNull();
    }
  });

  it("commits the value at the key Enter, without inserting a line break", async () => {
    const { container, session } = await renderPresented();
    const area = element<HTMLTextAreaElement>(row(container, "title"), "textarea");
    fireEvent.focus(area);
    fireEvent.input(area, { target: { value: "Damped pendulum" } });
    expect(session.text).toContain("title: Pendulum\n");
    const proceeded = fireEvent.keyDown(area, { key: "Enter" });
    expect(proceeded).toBe(false);
    expect(session.text).toContain("title: Damped pendulum\n");
    expect(element<HTMLTextAreaElement>(row(container, "title"), "textarea").value).toBe(
      "Damped pendulum",
    );
  });

  it("turns each pasted line break into a space, and keeps the value on one line in the file", async () => {
    const { container, session } = await renderPresented();
    const area = element<HTMLTextAreaElement>(row(container, "title"), "textarea");
    fireEvent.focus(area);
    fireEvent.input(area, { target: { value: "A long\nvalue pasted\r\nfrom a note" } });
    expect(area.value).toBe("A long value pasted from a note");
    fireEvent.blur(area);
    expect(session.text).toContain("title: A long value pasted from a note\n");
  });

  it("applies the same rule to the editor of a rendered single-line kind", async () => {
    const { container, session } = await renderPresented();
    const area = element<HTMLTextAreaElement>(row(container, "summary"), "textarea");
    fireEvent.focus(area);
    fireEvent.input(area, { target: { value: "A *line*\nwith a break" } });
    fireEvent.keyDown(area, { key: "Enter" });
    expect(session.text).toContain("summary: A *line* with a break\n");
  });

  it("keeps the line breaks of a value that already holds one, at the key Enter and at a paste", async () => {
    const { container, session } = await renderPresented(
      TEXT.replace("title: Pendulum\n", "title: |\n  First line.\n  Second line.\n"),
    );
    const area = element<HTMLTextAreaElement>(row(container, "title"), "textarea");
    expect(area.value).toBe("First line.\nSecond line.\n");
    fireEvent.focus(area);
    expect(fireEvent.keyDown(area, { key: "Enter" })).toBe(true);
    fireEvent.input(area, { target: { value: "First line.\nSecond line.\nThird line.\n" } });
    expect(area.value).toBe("First line.\nSecond line.\nThird line.\n");
    fireEvent.blur(area);
    expect(session.text).toContain("title: |\n  First line.\n  Second line.\n  Third line.\n");
  });

  it("reads a pair carriage return and line feed as one line break", () => {
    expect(withoutLineBreaks("a\r\nb\rc\nd")).toBe("a b c d");
  });
});

/** Option and description of each item of the list of options `options`, as two cells. */
function cells(options: Element): string[][] {
  return Array.from(options.querySelectorAll("li"), (item) =>
    Array.from(item.children, (cell) => cell.textContent ?? ""),
  );
}

describe("descriptions of the options of a choice", () => {
  it("shows the described options with the instructions of the field, on demand", async () => {
    const { container } = await renderPresented();
    expect(row(container, "status").textContent).not.toContain("awaits an answer");
    fireEvent.click(element(row(container, "status"), ".ekphrasis-help-button"));
    const options = element(row(container, "status"), ".ekphrasis-help-options");
    expect(cells(options)).toEqual([
      ["Posed (posed)", "The question awaits an answer."],
      ["Answered (answered)", "An answer is recorded."],
    ]);
  });

  it("shows them with every instruction, and under the header of a table for a column", async () => {
    const { container, help } = await renderPresented("rows:\n  - name: a\n    state: open\n");
    expect(container.textContent).not.toContain("being filled");
    help.setAll(true);
    const rows = row(container, "rows");
    expect(cells(element(rows, ".ekphrasis-help-options"))).toContainEqual([
      "open",
      "The row is being filled.",
    ]);
    expect(element(rows, "td[data-kind='choice']").textContent).not.toContain("being filled");
  });
});

describe("empty collections", () => {
  it("displays no message in an empty list, table or keyed mapping, only the way to add", async () => {
    const { container } = await renderPresented();
    for (const id of ["tags", "rows", "terms"]) {
      const section = row(container, id);
      expect(section.querySelector(".ekphrasis-empty")).toBeNull();
      expect(section.querySelector(".ekphrasis-add, .ekphrasis-key-adder")).not.toBeNull();
    }
    expect(container.textContent).not.toMatch(/No (items|rows|entries)\./);
  });
});
