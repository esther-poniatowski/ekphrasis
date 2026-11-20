// @vitest-environment happy-dom
/**
 * Reproduction of a report: a cleared optional field of kind `markdown` was said to stay in the
 * form after clearing. The specification of cleared values requires its key to leave the file, so
 * the field leaves the form unless the author still holds it as a draft.
 */
import { cleanup, fireEvent } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryFileSource } from "../support/fixture-vault";
import { element, renderForm } from "../support/rendered-form";

const SCHEMA = `
title: Entry
type: object
required: [title]
properties:
  title: { type: string, title: Title }
  details:
    type: string
    title: Details
    x-kind: markdown
`;

afterEach(cleanup);

const render = (text: string) =>
  renderForm(
    new MemoryFileSource({ "s.yaml": SCHEMA }),
    [{ pattern: "*.yml", schema: "s.yaml" }],
    "entry.yml",
    text,
  );

const details = (container: Element): Element | null =>
  container.querySelector('[data-path="details"]');

/** Opens the editor of the rendered value of `details`, clears it, and leaves it. */
function clearDetails(container: Element): void {
  const rendered = container.querySelector('[data-path="details"] [role="button"]');
  if (rendered !== null) fireEvent.focus(rendered);
  const editor = element<HTMLTextAreaElement>(container, '[data-path="details"] textarea');
  fireEvent.focus(editor);
  fireEvent.input(editor, { target: { value: "" } });
  fireEvent.blur(editor);
}

describe("a cleared optional Markdown field", () => {
  it("leaves the file and the form when its value was written plain", async () => {
    const { container, session } = await render("title: Entry\ndetails: Some *text*\n");
    clearDetails(container);
    expect(session.text).toBe("title: Entry\n");
    expect(details(container)).toBeNull();
  });

  it("leaves the file and the form when its value was a block scalar", async () => {
    const { container, session } = await render(
      "title: Entry\ndetails: |\n  First line.\n  Second line.\n# closing comment\n",
    );
    clearDetails(container);
    expect(session.text).toBe("title: Entry\n# closing comment\n");
    expect(details(container)).toBeNull();
  });

  it("leaves the file, and stays a discardable draft, when the author revealed it", async () => {
    const { container, session } = await render("title: Entry\n");
    fireEvent.change(element(container, 'select[aria-label="Add an optional field"]'), {
      target: { value: "details" },
    });
    const editor = element<HTMLTextAreaElement>(container, '[data-path="details"] textarea');
    fireEvent.focus(editor);
    fireEvent.input(editor, { target: { value: "Some text" } });
    fireEvent.blur(editor);
    expect(session.text).toBe("title: Entry\ndetails: Some text\n");

    clearDetails(container);
    expect(session.text).toBe("title: Entry\n");
    expect(details(container)).not.toBeNull();
    expect(container.querySelector('button[aria-label="Discard Details"]')).not.toBeNull();
  });
});
