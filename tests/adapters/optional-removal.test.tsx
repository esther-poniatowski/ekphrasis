// @vitest-environment happy-dom
/**
 * Removal of an optional field present in the file: its key leaves the file with its whole value,
 * the comments of its lines stay, and the field leaves the form. A required field, a field
 * required by a current conditional rule, and a read-only field offer no removal.
 */
import { cleanup, fireEvent } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryFileSource } from "../support/fixture-vault";
import { element, renderForm } from "../support/rendered-form";

const SCHEMA = `
title: Entry
type: object
required: [title]
x-rules:
  - check: required-when
    field: reason
    when: { field: archived, equals: true }
properties:
  title: { type: string, title: Title }
  archived: { type: boolean, title: Archived }
  reason: { type: string, title: Reason }
  details:
    type: object
    title: Details
    properties:
      summary: { type: string, title: Summary }
      tags: { type: array, title: Tags, items: { type: string } }
`;

afterEach(cleanup);

const render = (text: string, schema = SCHEMA) =>
  renderForm(
    new MemoryFileSource({ "s.yaml": schema }),
    [{ pattern: "*.yml", schema: "s.yaml" }],
    "entry.yml",
    text,
  );

const field = (container: Element, path: string): Element | null =>
  container.querySelector(`[data-path="${path}"]`);

const removal = (container: Element, label: string): HTMLButtonElement | null =>
  container.querySelector<HTMLButtonElement>(`button[aria-label="Remove ${label}"]`);

describe("removal of an optional field", () => {
  it("removes a toggle, which has no empty state, with its key", async () => {
    const { container, session } = await render("title: Entry\narchived: false\n");
    fireEvent.click(element(container, 'button[aria-label="Remove Archived"]'));
    expect(session.text).toBe("title: Entry\n");
    expect(field(container, "archived")).toBeNull();
  });

  it("offers no removal of a required field", async () => {
    const { container } = await render("title: Entry\n");
    expect(field(container, "title")).not.toBeNull();
    expect(removal(container, "Title")).toBeNull();
  });

  it("offers no removal of a field that a current conditional rule requires", async () => {
    const { container } = await render("title: Entry\narchived: true\nreason: Done\n");
    expect(removal(container, "Reason")).toBeNull();
    expect(removal(container, "Archived")).not.toBeNull();
  });

  it("removes a collection with its whole value, and keeps the comments of its lines", async () => {
    const { container, session } = await render(
      "title: Entry\ndetails:\n  summary: Short # kept\n  tags: [a, b]\n",
    );
    fireEvent.click(element(container, 'button[aria-label="Remove Tags"]'));
    expect(session.text).toBe("title: Entry\ndetails:\n  summary: Short # kept\n");
    fireEvent.click(element(container, 'button[aria-label="Remove Details"]'));
    expect(session.text).toBe("title: Entry\n# kept\n");
    expect(field(container, "details")).toBeNull();
  });

  it("leaves a mapping without keys with an empty value, so its next field is written in block form", async () => {
    const { container, session } = await render("title: Entry\ndetails:\n  summary: Short\n");
    fireEvent.click(element(container, 'button[aria-label="Remove Summary"]'));
    expect(session.text).toBe("title: Entry\ndetails:\n");
    expect(field(container, "details.summary")).toBeNull();
    expect(removal(container, "Details")).not.toBeNull();
  });

  it("ends the draft of a field that the author revealed, so the field leaves the form", async () => {
    const { container, session } = await render("title: Entry\n");
    fireEvent.change(element(container, 'select[aria-label="Add an optional field"]'), {
      target: { value: "archived" },
    });
    fireEvent.click(element(container, '[data-path="archived"] input[type="checkbox"]'));
    expect(session.text).toBe("title: Entry\narchived: true\n");

    fireEvent.click(element(container, 'button[aria-label="Remove Archived"]'));
    expect(session.text).toBe("title: Entry\n");
    expect(field(container, "archived")).toBeNull();
  });

  it("refuses to remove the only key of the root, which has no key of its own to keep", async () => {
    const { container, session } = await render(
      "# head\narchived: true\n",
      SCHEMA.replace("required: [title]", "required: []"),
    );
    fireEvent.click(element(container, 'button[aria-label="Remove Archived"]'));
    expect(session.text).toBe("# head\narchived: true\n");
    expect(
      element(container, '[data-path="archived"] .ekphrasis-commit-error').textContent,
    ).toContain("could not be determined");
  });

  it("offers no removal in a read-only form", async () => {
    const { container } = await render(
      "title: Entry\narchived: false\n",
      SCHEMA.replace("type: object\nrequired", "type: object\nreadOnly: true\nrequired"),
    );
    expect(field(container, "archived")).not.toBeNull();
    expect(removal(container, "Archived")).toBeNull();
  });
});
