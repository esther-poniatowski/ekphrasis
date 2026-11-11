// @vitest-environment happy-dom
/** Generic graph rendering from schema-declared roles, without producer-specific names. */
import { cleanup, fireEvent, within } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryFileSource } from "../support/fixture-vault";
import { editableControls, renderForm } from "../support/rendered-form";

const SCHEMA = `
type: object
readOnly: true
properties:
  network:
    type: object
    x-kind: graph
    title: Workflow
    properties:
      vertices:
        type: array
        x-graph-role: nodes
        items:
          type: object
          properties:
            code: { type: string, x-kind: label, x-graph-role: node-id }
            class: { type: string, x-kind: label, x-graph-role: node-category }
            class_name: { type: string, x-kind: label, x-graph-role: node-category-label }
            shape: { type: string, x-kind: label, x-graph-role: node-shape }
            marker: { type: string, x-kind: label, x-graph-role: node-marker }
            species: { type: string, x-kind: label, x-graph-role: node-kind }
            family: { type: string, x-kind: label, x-graph-role: node-family }
            caption: { type: string, x-graph-role: node-label }
            phase_axis: { type: string, x-kind: label, x-graph-role: node-status-axis }
            phase: { type: string, x-kind: label, x-graph-role: node-status }
            start: { type: boolean, x-graph-role: node-root }
            start_name: { type: string, x-kind: label, x-graph-role: node-root-label }
      links:
        type: array
        x-graph-role: edges
        items:
          type: object
          properties:
            from: { type: string, x-kind: label, x-graph-role: edge-source }
            to: { type: string, x-kind: label, x-graph-role: edge-target }
            class: { type: string, x-kind: label, x-graph-role: edge-kind }
            caption: { type: string, x-kind: label, x-graph-role: edge-label }
`;

const TEXT = `
network:
  vertices:
    - code: origin
      class: artifact
      class_name: Artifact
      shape: rectangle
      marker: ◇
      species: problem
      family: ""
      caption: Starting state
      phase_axis: Lifecycle
      phase: open
      start: true
      start_name: Initial objective
    - code: operation
      class: operation
      class_name: Operation
      shape: capsule
      marker: ○
      species: transformation
      family: synthesis
      caption: Transform inputs
      phase_axis: Check
      phase: pass
      start: false
      start_name: ""
    - code: result
      class: artifact
      class_name: Artifact
      shape: rectangle
      marker: ◇
      species: answer
      family: ""
      caption: Resulting state
      phase_axis: Lifecycle
      phase: proposed
      start: false
      start_name: ""
    - code: isolated
      class: external
      class_name: External input
      shape: dashed
      marker: ↗
      species: source
      family: ""
      caption: Separate source
      phase_axis: Availability
      phase: external
      start: false
      start_name: ""
  links:
    - from: origin
      to: operation
      class: takes
      caption: takes problem
    - from: operation
      to: result
      class: produces
      caption: produces answer
    - from: operation
      to: result
      class: supports
      caption: supports answer
    - from: isolated
      to: operation
      class: takes
      caption: takes external input
`;

afterEach(cleanup);

describe("generic graph section", () => {
  it("makes roots, categories, kinds, statuses, and directed relations explicit", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      TEXT,
    );

    expect(container.querySelector(".ekphrasis-table")).toBeNull();
    expect(container.querySelector(".ekphrasis-graph-viewport")?.getAttribute("aria-label")).toBe(
      "Workflow",
    );
    let nodes = Array.from(container.querySelectorAll<HTMLElement>(".ekphrasis-graph-node"));
    expect(nodes).toHaveLength(3);
    expect(nodes[0]?.dataset.root).toBe("true");
    expect(nodes[0]?.getAttribute("aria-pressed")).toBe("true");
    expect(nodes[0]?.querySelector(".ekphrasis-graph-root")?.textContent).toBe("Initial objective");
    expect(nodes.map((node) => node.dataset.category)).toEqual([
      "artifact",
      "operation",
      "artifact",
    ]);
    expect(
      nodes.map((node) => node.querySelector(".ekphrasis-graph-node-kind")?.textContent),
    ).toEqual(["problem", "transformation", "answer"]);
    expect(
      nodes.map((node) => node.querySelector(".ekphrasis-graph-node-status strong")?.textContent),
    ).toEqual(["open", "pass", "proposed"]);
    expect(nodes[1]?.querySelector(".ekphrasis-graph-node-family")?.textContent).toBe("synthesis");
    expect(nodes[1]?.querySelector(".ekphrasis-graph-node-status span")?.textContent).toBe("Check");
    expect(
      Array.from(
        container.querySelectorAll(".ekphrasis-graph-edges text"),
        (edge) => edge.textContent,
      ),
    ).toEqual(["takes problem", "produces answer", "supports answer"]);
    expect(
      new Set(
        Array.from(container.querySelectorAll(".ekphrasis-graph-edges > g path"), (edge) =>
          edge.getAttribute("d"),
        ),
      ).size,
    ).toBe(3);
    expect(editableControls(container)).toEqual([]);
    fireEvent.click(within(container as HTMLElement).getByText("Show whole graph"));
    nodes = Array.from(container.querySelectorAll<HTMLElement>(".ekphrasis-graph-node"));
    expect(nodes).toHaveLength(4);
  });

  it("zooms and isolates the connected research path on selection", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      TEXT,
    );

    const view = within(container as HTMLElement);
    fireEvent.click(view.getByLabelText("Zoom in"));
    expect(view.getByLabelText("Zoom level").textContent).toBe("125%");
    expect(view.getByText("Show immediate relations")).not.toBeNull();
    fireEvent.click(view.getByText("Show immediate relations"));
    expect(container.querySelectorAll(".ekphrasis-graph-node")).toHaveLength(2);
    fireEvent.click(view.getByText("Trace complete routes"));
    expect(container.querySelectorAll(".ekphrasis-graph-node")).toHaveLength(3);
    expect(
      container.querySelector("[data-selected='true'] .ekphrasis-graph-node-id")?.textContent,
    ).toBe("origin");
    expect(view.getByText("Show whole graph")).not.toBeNull();
  });

  it("retains the ordinary mapping editor for a writable graph", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({
        "graph.schema.yml": SCHEMA.replace("readOnly: true\n", ""),
      }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "record.yml",
      TEXT,
    );

    expect(container.querySelector(".ekphrasis-graph-viewport")).toBeNull();
    expect(editableControls(container).length).toBeGreaterThan(0);
  });
});
