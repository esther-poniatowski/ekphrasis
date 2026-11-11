// @vitest-environment happy-dom
/** Generic tree rendering from schema-declared roles, without consumer-specific field names. */
import { cleanup } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryFileSource } from "../support/fixture-vault";
import { editableControls, renderForm } from "../support/rendered-form";

const SCHEMA = `
type: object
readOnly: true
properties:
  entries:
    type: array
    x-kind: tree
    title: Entries
    items:
      type: object
      properties:
        code: { type: string, x-kind: label, x-tree-role: identifier }
        category: { type: string, x-kind: label, x-tree-role: detail, title: Category }
        caption: { type: string, x-tree-role: label }
        phase: { type: string, x-kind: label, x-tree-role: detail, title: Phase }
        level: { type: integer, x-tree-role: depth }
`;

const TEXT = `
entries:
  - code: root-a
    category: root
    caption: First root
    phase: active
    level: 0
  - code: branch-a
    category: branch
    caption: First branch
    phase: open
    level: 1
  - code: leaf-a
    category: leaf
    caption: ""
    phase: settled
    level: 2
  - code: root-b
    category: root
    caption: Second root
    phase: open
    level: 0
`;

afterEach(cleanup);

describe("generic tree section", () => {
  it("renders the declared hierarchy and roles without editable controls", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "tree.schema.yml": SCHEMA }),
      [{ pattern: "*.yml", schema: "tree.schema.yml" }],
      "view.yml",
      TEXT,
    );

    expect(container.querySelector(".ekphrasis-table")).toBeNull();
    expect(container.querySelector("[role='tree']")?.getAttribute("aria-label")).toBe("Entries");
    const nodes = Array.from(container.querySelectorAll<HTMLElement>("[role='treeitem']"));
    expect(nodes.map((node) => node.getAttribute("aria-level"))).toEqual(["1", "2", "3", "1"]);
    expect(nodes.map((node) => node.querySelector(".ekphrasis-tree-label")?.textContent)).toEqual([
      "First root",
      "First branch",
      "leaf-a",
      "Second root",
    ]);
    expect(nodes[0]?.querySelector(".ekphrasis-tree-identifier")?.textContent).toBe("root-a");
    expect(
      Array.from(
        nodes[0]?.querySelectorAll(":scope > .ekphrasis-tree-node > .ekphrasis-tree-detail") ?? [],
        (detail) => detail.textContent?.trim(),
      ),
    ).toEqual(["Category: root", "Phase: active"]);
    expect(editableControls(container)).toEqual([]);
  });

  it("retains the records editor for a writable value", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({
        "tree.schema.yml": SCHEMA.replace("readOnly: true\n", ""),
      }),
      [{ pattern: "*.yml", schema: "tree.schema.yml" }],
      "record.yml",
      TEXT,
    );

    expect(container.querySelector("[role='tree']")).toBeNull();
    expect(editableControls(container).length).toBeGreaterThan(0);
    expect(
      Array.from(
        container.querySelectorAll("button.ekphrasis-add"),
        (button) => button.textContent,
      ),
    ).toContain("+ Add an item");
  });
});
