// @vitest-environment happy-dom
/**
 * Controls of the kinds `date` and `duration`, derived from the keyword `format`: their icons,
 * their placeholders stating the expected form, the calendar of a date, and the issue of a text
 * that does not follow the format.
 */
import { cleanup, fireEvent } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryFileSource } from "../support/fixture-vault";
import { element, renderForm } from "../support/rendered-form";

const SCHEMA = `
title: Session
type: object
properties:
  due: { type: string, format: date, title: Due }
  length: { type: string, format: duration, title: Length }
  start: { type: string, format: date, title: Start, examples: ["2026-03-01"] }
`;

afterEach(cleanup);

const render = (text: string, schema = SCHEMA) =>
  renderForm(
    new MemoryFileSource({ "s.yaml": schema }),
    [{ pattern: "*.yml", schema: "s.yaml" }],
    "session.yml",
    text,
  );

const input = (container: Element, path: string): HTMLInputElement =>
  element<HTMLInputElement>(container, `[data-path="${path}"] input[type="text"]`);

describe("date and duration controls", () => {
  it("draws the icon of each kind, and states the expected form in an empty control", async () => {
    const { container } = await render("due:\nlength:\nstart:\n");
    expect(container.querySelector('[data-path="due"] [data-icon="calendar"]')).not.toBeNull();
    expect(container.querySelector('[data-path="length"] [data-icon="timer"]')).not.toBeNull();
    expect(input(container, "due").placeholder).toBe("— YYYY-MM-DD");
    expect(input(container, "length").placeholder).toBe("— ISO 8601, such as PT1H30M");
    expect(input(container, "start").placeholder).toBe("— 2026-03-01");
  });

  it("commits a date chosen in the calendar, and mirrors a typed calendar date in it", async () => {
    const { container, session } = await render("due: 2026-11-01\n");
    const calendar = element<HTMLInputElement>(container, '[data-path="due"] input[type="date"]');
    expect(calendar.value).toBe("2026-11-01");
    expect(container.querySelector('button[aria-label="Choose Due in a calendar"]')).not.toBeNull();

    fireEvent.change(calendar, { target: { value: "2026-11-15" } });
    expect(session.text).toBe("due: '2026-11-15'\n");
    expect(input(container, "due").value).toBe("2026-11-15");

    fireEvent.keyDown(input(container, "due"), { key: "z", metaKey: true });
    expect(input(container, "due").value).toBe("2026-11-01");
    expect(session.text).toBe("due: '2026-11-01'\n");
  });

  it("keeps a text that is no calendar date visible, and reports its expected form", async () => {
    const { container } = await render("due: 2026-11\nlength: 2 hours\n");
    expect(input(container, "due").value).toBe("2026-11");
    expect(element<HTMLInputElement>(container, '[data-path="due"] input[type="date"]').value).toBe(
      "",
    );
    expect(element(container, '[data-path="due"]').textContent).toContain(
      "The text must be a calendar date written YYYY-MM-DD",
    );
    expect(element(container, '[data-path="length"]').textContent).toContain(
      "The text must be an ISO 8601 duration",
    );
  });

  it("writes a typed duration as a plain scalar", async () => {
    const { container, session } = await render("length:\n");
    const length = input(container, "length");
    fireEvent.focus(length);
    fireEvent.input(length, { target: { value: "PT2H" } });
    fireEvent.blur(length);
    expect(session.text).toBe("length: PT2H\n");
  });

  it("offers no calendar on a read-only date", async () => {
    const { container } = await render(
      "due: 2026-11-01\n",
      SCHEMA.replace("type: object", "type: object\nreadOnly: true"),
    );
    expect(input(container, "due").readOnly).toBe(true);
    expect(container.querySelector('[data-path="due"] input[type="date"]')).toBeNull();
  });
});
