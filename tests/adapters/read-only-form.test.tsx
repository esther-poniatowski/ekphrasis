// @vitest-environment happy-dom
/**
 * Form of an instance whose schema declares `readOnly: true` at its root, in a simulated DOM: the
 * values of every kind display, and no control changes them. The same form without the keyword
 * offers editable controls of each kind, so the check is shown to detect them.
 */
import { cleanup } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryFileSource } from "../support/fixture-vault";
import { editableControls, renderForm } from "../support/rendered-form";

const PROPERTIES = `
properties:
  title: { type: string }
  count: { type: integer }
  flag: { type: boolean }
  status: { enum: [open, closed] }
  formula: { type: string, x-kind: latex }
  note: { type: string, x-kind: markdown }
  tags: { type: array, items: { type: string } }
  kinds: { type: array, uniqueItems: true, items: { enum: [a, b] } }
  rows:
    type: array
    x-kind: table
    items:
      type: object
      properties:
        name: { type: string, x-kind: label }
        formula: { type: string, x-kind: latex }
        sources: { type: array, items: { type: string } }
  terms:
    type: object
    additionalProperties:
      type: object
      properties: { label: { type: string } }
`;

const TEXT = [
  "title: A view",
  "count: 2",
  "flag: true",
  "status: open",
  "formula: x^2",
  "note: Some *text*.",
  "tags: [x, y]",
  "kinds: [a]",
  "rows:",
  "  - name: r1",
  "    formula: x^2",
  "    sources: [s1, s2]",
  "terms:",
  "  t1:",
  "    label: T",
  "",
].join("\n");

afterEach(cleanup);

function renderWith(header: string): Promise<{ container: Element }> {
  return renderForm(
    new MemoryFileSource({ "s.yaml": `type: object\n${header}${PROPERTIES}` }),
    [{ pattern: "*.yml", schema: "s.yaml" }],
    "r.yml",
    TEXT,
  );
}

describe("form of a read-only schema", () => {
  it("offers editable controls when the schema leaves the instance writable", async () => {
    const { container } = await renderWith("");
    expect(editableControls(container).length).toBeGreaterThan(10);
  });

  it("displays every value without a control that changes it", async () => {
    const { container } = await renderWith("readOnly: true\n");
    expect(container.querySelector(".ekphrasis-table")).not.toBeNull();
    const values = Array.from(
      container.querySelectorAll<HTMLInputElement>("input, textarea"),
      (control) => control.value,
    );
    expect(values).toEqual(expect.arrayContaining(["A view", "T"]));
    const tokens = Array.from(
      container.querySelectorAll(".ekphrasis-cell-item"),
      (token) => token.textContent,
    );
    expect(tokens).toEqual(["s1", "s2"]);
    expect(container.querySelector("td[data-kind='label'] input")).toBeNull();
    expect(
      container.querySelector("td[data-kind='label'] .ekphrasis-cell-label")?.textContent,
    ).toBe("r1");
    expect(
      container.querySelector("td[data-kind='latex'] input, td[data-kind='latex'] textarea"),
    ).toBeNull();
    expect(
      container
        .querySelector("td[data-kind='latex'] .ekphrasis-rendered")
        ?.getAttribute("data-display"),
    ).toBe("inline");
    const tableRegion = container.querySelector(".ekphrasis-table-scroll");
    expect(tableRegion?.getAttribute("role")).toBe("region");
    expect(tableRegion?.getAttribute("tabindex")).toBe("0");
    expect(tableRegion?.getAttribute("aria-label")).toBe("rows table");
    expect(editableControls(container).map((control) => control.outerHTML)).toEqual([]);
  });
});
