// @vitest-environment happy-dom
/**
 * Progressive display of optional properties: absent optional fields stay behind one chooser,
 * a selected field remains a source-free draft until its first commit, and a discarded draft
 * leaves neither source text nor nested draft state behind.
 */
import { cleanup, fireEvent } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryFileSource } from "../support/fixture-vault";
import { element, renderForm } from "../support/rendered-form";

const SCHEMA = `
title: Progressive record
type: object
required: [title, mandatory]
properties:
  title: { type: string, title: Title }
  note: { type: string, title: Note }
  details:
    type: object
    title: Details
    properties:
      summary: { type: string, title: Summary }
  mandatory:
    type: object
    title: Mandatory
    required: [name]
    properties:
      name: { type: string, title: Name }
`;

const CONDITIONAL_SCHEMA = `
title: Conditional record
type: object
required: [aim]
x-rules:
  - check: required-when
    field: relation
    when: { field: aim, equals: explanation }
properties:
  aim:
    type: string
    title: Aim
    enum: [description, explanation]
  relation: { type: string, title: Requested relation }
  note: { type: string, title: Note }
`;

afterEach(cleanup);

async function renderProgressive(schema = SCHEMA) {
  return renderForm(
    new MemoryFileSource({ "s.yaml": schema }),
    [{ pattern: "*.yml", schema: "s.yaml" }],
    "record.yml",
    "title: Existing\n",
  );
}

const field = (container: Element, path: string): Element | null =>
  container.querySelector(`[data-path="${path}"]`);

const options = (select: HTMLSelectElement): string[] =>
  Array.from(select.options, (option) => option.textContent ?? "");

describe("absent optional fields", () => {
  it("shows present and required fields, and reveals an optional scalar without writing it", async () => {
    const { container, session, reveals } = await renderProgressive();

    expect(field(container, "title")).not.toBeNull();
    expect(field(container, "mandatory")).not.toBeNull();
    expect(field(container, "mandatory.name")).not.toBeNull();
    expect(field(container, "note")).toBeNull();
    expect(field(container, "details")).toBeNull();

    const add = element<HTMLSelectElement>(container, 'select[aria-label="Add an optional field"]');
    expect(options(add)).toEqual(["+ Add a field", "Note", "Details"]);
    fireEvent.change(add, { target: { value: "note" } });

    expect(field(container, "note")).not.toBeNull();
    expect(session.text).toBe("title: Existing\n");
    expect(reveals).toEqual([["note"]]);

    const note = element<HTMLTextAreaElement>(container, '[data-path="note"] textarea');
    fireEvent.input(note, { target: { value: "A stated note" } });
    fireEvent.blur(note);
    expect(session.text).toBe("title: Existing\nnote: A stated note\n");
    expect(options(element(container, 'select[aria-label="Add an optional field"]'))).toEqual([
      "+ Add a field",
      "Details",
    ]);
  });

  it("reveals a nested branch as drafts, and discards the whole branch without a write", async () => {
    const { container, session } = await renderProgressive();
    const addRoot = element<HTMLSelectElement>(
      container,
      'select[aria-label="Add an optional field"]',
    );
    fireEvent.change(addRoot, { target: { value: "details" } });

    expect(field(container, "details")).not.toBeNull();
    expect(field(container, "details.summary")).toBeNull();
    const addDetails = element<HTMLSelectElement>(
      container,
      'select[aria-label="Add an optional field to Details"]',
    );
    fireEvent.change(addDetails, { target: { value: "details.summary" } });
    expect(field(container, "details.summary")).not.toBeNull();
    expect(session.text).toBe("title: Existing\n");

    fireEvent.click(element(container, 'button[aria-label="Discard Details"]'));
    expect(field(container, "details")).toBeNull();
    expect(session.text).toBe("title: Existing\n");

    fireEvent.change(element(container, 'select[aria-label="Add an optional field"]'), {
      target: { value: "details" },
    });
    expect(field(container, "details")).not.toBeNull();
    expect(field(container, "details.summary")).toBeNull();
  });

  it("offers no absent field in a read-only form", async () => {
    const { container } = await renderProgressive(
      SCHEMA.replace("type: object", "type: object\nreadOnly: true"),
    );
    expect(field(container, "note")).toBeNull();
    expect(container.querySelector(".ekphrasis-optional-field-adder")).toBeNull();
  });

  it("follows an authored choice without hiding a value already written", async () => {
    const { container, session } = await renderProgressive(CONDITIONAL_SCHEMA);
    const aim = (): HTMLSelectElement =>
      element<HTMLSelectElement>(container, '[data-path="aim"] select');

    expect(field(container, "relation")).toBeNull();
    fireEvent.change(aim(), { target: { value: "1" } });

    const relation = element(container, '[data-path="relation"]');
    expect(relation.querySelector('[aria-label="required"]')).not.toBeNull();
    expect(relation.querySelector('button[aria-label="Discard Requested relation"]')).toBeNull();
    expect(session.text).toBe("title: Existing\naim: explanation\n");

    fireEvent.change(aim(), { target: { value: "0" } });
    expect(field(container, "relation")).toBeNull();

    fireEvent.change(aim(), { target: { value: "1" } });
    const control = element<HTMLTextAreaElement>(container, '[data-path="relation"] textarea');
    fireEvent.input(control, { target: { value: "causal" } });
    fireEvent.blur(control);
    fireEvent.change(aim(), { target: { value: "0" } });

    expect(field(container, "relation")).not.toBeNull();
    expect(session.text).toContain("relation: causal");
  });
});
