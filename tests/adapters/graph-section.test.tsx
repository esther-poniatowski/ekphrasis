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
            destination: { type: string, x-kind: label, x-graph-role: node-link }
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
      destination: obsidian://example?id=origin
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
      destination: ""
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
      destination: obsidian://example?id=result
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
      destination: https://example.org/source
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

const PROFILE_SCHEMA = SCHEMA.replace(
  "    properties:\n      vertices:",
  `    properties:
      appearance:
        type: object
        x-graph-role: presentation
        properties:
          profile: { type: string }
          version: { type: integer }
          layouts:
            type: object
            properties:
              recommended: { type: string }
              compatible: { type: array, items: { type: string } }
          categories:
            type: array
            items:
              type: object
              properties:
                id: { type: string }
                title: { type: string }
                shape: { type: string }
                marker: { type: string }
                style: { type: string }
          node_kinds:
            type: array
            items:
              type: object
              properties:
                id: { type: string }
                category: { type: string }
                title: { type: string }
                icon: { type: string }
                marker: { type: string }
                style: { type: string }
          edge_kinds:
            type: array
            items:
              type: object
              properties:
                id: { type: string }
                title: { type: string }
                layer: { type: string }
                style: { type: string }
                arrow: { type: string }
                caption: { type: string }
      vertices:`,
);

const PROFILE_TEXT = TEXT.replace(
  "network:\n",
  `network:
  appearance:
    profile: sample-workflow
    version: 3
    layouts:
      recommended: force-directed
      compatible: [layered-directed, force-directed, compact-network]
    categories:
      - { id: artifact, title: Work product, shape: rectangle, marker: ◇, style: product }
      - { id: operation, title: Work step, shape: capsule, marker: ○, style: activity }
    node_kinds:
      - { id: problem, category: artifact, title: Challenge, icon: circle-alert, marker: "!", style: concern }
      - { id: answer, category: artifact, title: Resolution, icon: lightbulb, marker: "✦", style: result }
    edge_kinds:
      - { id: takes, title: consumes, layer: flow, style: dependency, arrow: diamond, caption: hide }
      - { id: produces, title: yields, layer: flow, style: production }
`,
);

afterEach(cleanup);

describe("generic graph section", () => {
  it("applies one portable profile without knowing the producer vocabulary", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": PROFILE_SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      PROFILE_TEXT,
    );

    const section = container.querySelector<HTMLElement>(".ekphrasis-graph-section");
    expect(section?.dataset.presentationProfile).toBe("sample-workflow");
    expect(section?.dataset.presentationVersion).toBe("3");
    expect(container.querySelector<HTMLElement>(".ekphrasis-graph-viewport")?.dataset.layout).toBe(
      "network",
    );
    const layout = within(container as HTMLElement).getByLabelText<HTMLSelectElement>("Layout");
    expect(layout.value).toBe("force-directed");
    expect(Array.from(layout.options, (option) => option.textContent)).toEqual([
      "layered chronology",
      "network",
      "map",
    ]);
    const challenge = container.querySelector<HTMLElement>("[data-kind='problem']");
    expect(challenge?.dataset.categoryStyle).toBe("product");
    expect(challenge?.dataset.kindStyle).toBe("concern");
    expect(challenge?.querySelector(".ekphrasis-graph-node-kind")?.textContent).toBe("Challenge");
    expect(challenge?.querySelector<HTMLElement>(".ekphrasis-graph-node-icon")?.dataset.icon).toBe(
      "circle-alert",
    );
    const transformation = container.querySelector<HTMLElement>("[data-kind='transformation']");
    expect(transformation?.querySelector(".ekphrasis-graph-node-kind")?.textContent).toBe(
      "transformation",
    );
    expect(transformation?.querySelector(".ekphrasis-graph-node-symbol")?.textContent).toBe(
      "○\uFE0E",
    );
    const edge = container.querySelector<SVGGElement>(".ekphrasis-graph-edges [data-kind='takes']");
    expect(edge?.dataset.layer).toBe("flow");
    expect(edge?.dataset.style).toBe("dependency");
    expect(edge?.dataset.arrow).toBe("diamond");
    expect(edge?.dataset.caption).toBe("hide");
    expect(edge?.querySelector(":scope > path")?.getAttribute("marker-end")).toContain(
      "graph-diamond",
    );
    expect(edge?.querySelector("text")).toBeNull();
  });

  it("applies one matching local override without changing producer semantics", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": PROFILE_SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      PROFILE_TEXT,
      true,
      {
        graphPresentationOverrides: [
          {
            profile: "sample-workflow",
            version: 3,
            layouts: {
              recommended: "layered-directed",
              compatible: ["layered-directed"],
            },
            categories: {
              artifact: {
                title: "Local artifact",
                marker: "□",
                style: "local-product",
              },
            },
            nodeKinds: {
              problem: {
                category: "operation",
                title: "Local challenge",
                icon: "not-a-real-lucide-icon",
                style: "local-concern",
              },
            },
            edgeKinds: {
              takes: {
                title: "uses locally",
                layer: "changed-layer",
                style: "local-input",
                arrow: "none",
                caption: "show",
              },
              supports: {
                title: "supports locally",
                layer: "evidence",
                style: "local-support",
                arrow: "circle",
                caption: "hide",
              },
            },
          },
        ],
      },
    );

    const view = within(container as HTMLElement);
    expect(view.queryByLabelText("Layout")).toBeNull();
    expect(container.querySelector<HTMLElement>(".ekphrasis-graph-viewport")?.dataset.layout).toBe(
      "layered",
    );
    const challenge = container.querySelector<HTMLElement>("[data-kind='problem']");
    expect(challenge?.dataset.categoryStyle).toBe("local-product");
    expect(challenge?.dataset.kindStyle).toBe("local-concern");
    expect(challenge?.querySelector(".ekphrasis-graph-node-kind")?.textContent).toBe(
      "Local challenge",
    );
    expect(challenge?.querySelector<HTMLElement>(".ekphrasis-graph-node-icon")?.dataset.icon).toBe(
      "not-a-real-lucide-icon",
    );
    expect(challenge?.querySelector(".ekphrasis-graph-node-icon")?.textContent).toBe("!\uFE0E");
    fireEvent.change(view.getByLabelText("Card detail"), {
      target: { value: "expanded" },
    });
    expect(challenge?.querySelector(".ekphrasis-graph-node-details")?.textContent).toContain(
      "CategoryLocal artifact",
    );
    const takes = container.querySelector<SVGGElement>(
      ".ekphrasis-graph-edges [data-kind='takes']",
    );
    expect(takes?.dataset.layer).toBe("flow");
    expect(takes?.dataset.style).toBe("local-input");
    expect(takes?.querySelector(":scope > path")?.hasAttribute("marker-end")).toBe(false);
    expect(takes?.querySelector("text")?.textContent).toBe("uses locally");
    const supports = container.querySelector<SVGGElement>(
      ".ekphrasis-graph-edges [data-kind='supports']",
    );
    expect(supports?.dataset.layer).toBe("evidence");
    expect(supports?.dataset.style).toBe("local-support");
    expect(supports?.querySelector(":scope > path")?.getAttribute("marker-end")).toContain(
      "graph-circle",
    );
    expect(supports?.querySelector("text")).toBeNull();
  });

  it("ignores overrides for another presentation profile", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": PROFILE_SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      PROFILE_TEXT,
      true,
      {
        graphPresentationOverrides: [
          {
            profile: "another-workflow",
            version: 1,
            categories: { artifact: { title: "Wrong profile" } },
            nodeKinds: {},
            edgeKinds: {},
          },
        ],
      },
    );

    const view = within(container as HTMLElement);
    fireEvent.change(view.getByLabelText("Card detail"), {
      target: { value: "expanded" },
    });
    expect(
      container.querySelector("[data-kind='problem'] .ekphrasis-graph-node-details")?.textContent,
    ).toContain("CategoryWork product");
  });

  it("ignores an override for another version of the same profile", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": PROFILE_SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      PROFILE_TEXT,
      true,
      {
        graphPresentationOverrides: [
          {
            profile: "sample-workflow",
            version: 2,
            categories: { artifact: { title: "Stale title" } },
            nodeKinds: {},
            edgeKinds: {},
          },
        ],
      },
    );

    fireEvent.change(within(container as HTMLElement).getByLabelText("Card detail"), {
      target: { value: "expanded" },
    });
    expect(
      container.querySelector("[data-kind='problem'] .ekphrasis-graph-node-details")?.textContent,
    ).toContain("CategoryWork product");
  });

  it("retains producer layouts when a local narrowing admits none", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": PROFILE_SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      PROFILE_TEXT,
      true,
      {
        graphPresentationOverrides: [
          {
            profile: "sample-workflow",
            version: 3,
            layouts: { recommended: "unknown-layout", compatible: [] },
            categories: {},
            nodeKinds: {},
            edgeKinds: {},
          },
        ],
      },
    );

    expect(within(container as HTMLElement).getByLabelText<HTMLSelectElement>("Layout").value).toBe(
      "force-directed",
    );
  });

  it("ignores an unsafe icon and retains a non-executable marker fallback", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": PROFILE_SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      PROFILE_TEXT.replace("icon: circle-alert", "icon: <script>"),
    );

    const challenge = container.querySelector<HTMLElement>("[data-kind='problem']");
    expect(challenge?.querySelector(".ekphrasis-graph-node-icon")).toBeNull();
    expect(challenge?.querySelector(".ekphrasis-graph-node-symbol")?.textContent).toBe("◇\uFE0E");
  });

  it("offers only the compatible layouts declared by the profile", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": PROFILE_SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      PROFILE_TEXT.replace(
        "recommended: force-directed\n      compatible: [layered-directed, force-directed, compact-network]",
        "recommended: layered-directed\n      compatible: [layered-directed]",
      ),
    );

    expect(container.querySelector<HTMLElement>(".ekphrasis-graph-viewport")?.dataset.layout).toBe(
      "layered",
    );
    expect(within(container as HTMLElement).queryByLabelText("Layout")).toBeNull();
  });

  it("filters relation layers without losing the selected node across layouts", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": PROFILE_SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      PROFILE_TEXT,
    );

    const view = within(container as HTMLElement);
    expect(view.getByText("relations · 3 visible · 1 hidden")).not.toBeNull();
    const selected = container.querySelector<HTMLElement>("[data-selected='true']");
    expect(selected?.dataset.kind).toBe("problem");
    fireEvent.click(view.getByText("relations · 3 visible · 1 hidden"));
    fireEvent.click(view.getByLabelText("flow (3 relations)"));
    expect(view.getByText("relations · 0 visible · 4 hidden")).not.toBeNull();
    expect(container.querySelectorAll(".ekphrasis-graph-edges > g")).toHaveLength(0);
    expect(container.querySelector<HTMLElement>("[data-selected='true']")?.dataset.kind).toBe(
      "problem",
    );

    fireEvent.change(view.getByLabelText("Layout"), {
      target: { value: "layered-directed" },
    });
    expect(view.getByLabelText<HTMLInputElement>("flow (3 relations)").checked).toBe(false);
    expect(container.querySelector<HTMLElement>("[data-selected='true']")?.dataset.kind).toBe(
      "problem",
    );
    fireEvent.click(view.getByLabelText("flow (3 relations)"));
    expect(view.getByText("relations · 3 visible · 1 hidden")).not.toBeNull();
  });

  it("combines relation kinds with their broad layers", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": PROFILE_SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      PROFILE_TEXT,
    );

    const view = within(container as HTMLElement);
    fireEvent.click(view.getByText("relations · 3 visible · 1 hidden"));
    expect(view.getByText("relation layers")).not.toBeNull();
    expect(view.getByText("relation kinds")).not.toBeNull();
    expect(view.getByLabelText<HTMLInputElement>("consumes (2 relations)").checked).toBe(true);
    fireEvent.click(view.getByLabelText("yields (1 relation)"));
    expect(view.getByText("relations · 2 visible · 2 hidden")).not.toBeNull();
    fireEvent.click(view.getByLabelText("Other relations (1 relation)"));
    expect(view.getByText("relations · 1 visible · 3 hidden")).not.toBeNull();
    expect(container.querySelectorAll(".ekphrasis-graph-edges > g")).toHaveLength(1);

    fireEvent.change(view.getByLabelText("Layout"), {
      target: { value: "layered-directed" },
    });
    expect(view.getByLabelText<HTMLInputElement>("yields (1 relation)").checked).toBe(false);
    expect(container.querySelector<HTMLElement>("[data-selected='true']")?.dataset.kind).toBe(
      "problem",
    );
  });

  it("reports whole-graph relation counts and preserves nodes while filtering edges", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": PROFILE_SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      PROFILE_TEXT,
    );

    const view = within(container as HTMLElement);
    fireEvent.click(view.getByText("show whole graph"));
    expect(view.getByText("relations · 4 visible · 0 hidden")).not.toBeNull();
    fireEvent.click(view.getByText("relations · 4 visible · 0 hidden"));
    expect(view.getByLabelText<HTMLInputElement>("flow (3 relations)").checked).toBe(true);
    expect(view.getByLabelText<HTMLInputElement>("Other relations (1 relation)").checked).toBe(
      true,
    );
    fireEvent.click(view.getByLabelText("Other relations (1 relation)"));
    expect(container.querySelectorAll(".ekphrasis-graph-node")).toHaveLength(4);
    expect(container.querySelectorAll(".ekphrasis-graph-edges > g")).toHaveLength(3);
    expect(view.getByText("relations · 3 visible · 1 hidden")).not.toBeNull();
  });

  it("combines node values by OR within a facet and AND across facets", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": PROFILE_SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      PROFILE_TEXT,
    );

    const view = within(container as HTMLElement);
    expect(view.getByText("nodes · 3 visible · 1 hidden")).not.toBeNull();
    fireEvent.click(view.getByText("nodes · 3 visible · 1 hidden"));
    expect(view.getByText("Categories")).not.toBeNull();
    expect(view.getByText("Kinds")).not.toBeNull();
    expect(view.getByText("Activity families")).not.toBeNull();
    expect(view.getByText("Statuses")).not.toBeNull();
    fireEvent.click(view.getByLabelText("External input (1 node)"));
    fireEvent.change(view.getByLabelText("Layout"), {
      target: { value: "layered-directed" },
    });
    expect(view.getByLabelText<HTMLInputElement>("External input (1 node)").checked).toBe(false);
    expect(container.querySelector<HTMLElement>("[data-selected='true']")?.dataset.kind).toBe(
      "problem",
    );

    fireEvent.click(view.getByText("show whole graph"));
    expect(view.getByText("nodes · 3 visible · 1 hidden")).not.toBeNull();
    fireEvent.click(view.getByLabelText("Work step (1 node)"));
    expect(container.querySelectorAll(".ekphrasis-graph-node")).toHaveLength(2);
    fireEvent.click(view.getByLabelText("proposed (1 node)"));
    expect(container.querySelectorAll(".ekphrasis-graph-node")).toHaveLength(1);
    fireEvent.click(view.getByLabelText("Work step (1 node)"));
    expect(container.querySelectorAll(".ekphrasis-graph-node")).toHaveLength(2);
    expect(container.querySelectorAll(".ekphrasis-graph-edges > g")).toHaveLength(1);
    expect(view.getByText("nodes · 2 visible · 2 hidden")).not.toBeNull();
  });

  it("filters activity families without removing nodes outside that facet", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": PROFILE_SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      PROFILE_TEXT,
    );

    const view = within(container as HTMLElement);
    fireEvent.click(view.getByText("show whole graph"));
    fireEvent.click(view.getByText("nodes · 4 visible · 0 hidden"));
    fireEvent.click(view.getByLabelText("synthesis (1 node)"));
    expect(container.querySelectorAll(".ekphrasis-graph-node")).toHaveLength(3);
    expect(container.querySelectorAll(".ekphrasis-graph-edges > g")).toHaveLength(0);
    expect(view.getByText("nodes · 3 visible · 1 hidden")).not.toBeNull();
  });

  it("makes roots, categories, kinds, statuses, and directed relations explicit", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      TEXT,
    );

    expect(container.querySelector(".ekphrasis-table")).toBeNull();
    expect(
      within(container as HTMLElement).getByText("relations · 3 visible · 1 hidden"),
    ).not.toBeNull();
    expect(container.querySelector(".ekphrasis-graph-viewport")?.getAttribute("aria-label")).toBe(
      "Workflow",
    );
    let nodes = Array.from(container.querySelectorAll<HTMLElement>(".ekphrasis-graph-node"));
    expect(nodes).toHaveLength(3);
    expect(nodes[0]?.dataset.root).toBe("true");
    expect(
      nodes[0]?.querySelector(".ekphrasis-graph-node-focus")?.getAttribute("aria-pressed"),
    ).toBe("true");
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
    expect(nodes[1]?.querySelector(".ekphrasis-graph-node-status span")?.textContent).toBe(
      "Status",
    );
    expect(nodes[0]?.querySelector(".ekphrasis-graph-node-label")?.getAttribute("href")).toBe(
      "obsidian://example?id=origin",
    );
    expect(
      Array.from(
        container.querySelectorAll(".ekphrasis-graph-edges text"),
        (edge) => edge.textContent,
      ),
    ).toEqual(["takes problem", "produces answer", "supports answer"]);
    expect(
      new Set(
        Array.from(container.querySelectorAll(".ekphrasis-graph-edges > g > path"), (edge) =>
          edge.getAttribute("d"),
        ),
      ).size,
    ).toBe(3);
    expect(editableControls(container)).toEqual([]);
    fireEvent.click(within(container as HTMLElement).getByText("show whole graph"));
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
    const root = container.querySelector<HTMLElement>("[data-root='true']");
    const initialPosition = root?.getAttribute("style");
    fireEvent.click(view.getByLabelText("Zoom in"));
    expect(view.getByLabelText("Zoom level").textContent).toBe("125%");
    expect(view.getByText("show immediate relations")).not.toBeNull();
    fireEvent.click(view.getByText("show immediate relations"));
    expect(container.querySelectorAll(".ekphrasis-graph-node")).toHaveLength(2);
    expect(container.querySelector<HTMLElement>("[data-root='true']")?.getAttribute("style")).toBe(
      initialPosition,
    );
    fireEvent.click(view.getByText("trace complete routes"));
    expect(container.querySelectorAll(".ekphrasis-graph-node")).toHaveLength(3);
    expect(
      container
        .querySelector("[data-selected='true'] .ekphrasis-graph-node-focus")
        ?.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(view.getByText("show whole graph")).not.toBeNull();
  });

  it("traverses visible cards by relation and announces the traversed edge", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      TEXT,
    );

    const view = within(container as HTMLElement);
    const root = view.getByRole("button", { name: /^Focus problem:/u });
    const activity = view.getByRole("button", {
      name: /^Focus transformation:/u,
    });
    const answer = view.getByRole("button", { name: /^Focus answer:/u });
    expect(root.tabIndex).toBe(0);
    expect(activity.tabIndex).toBe(-1);
    expect(answer.tabIndex).toBe(-1);

    root.focus();
    fireEvent.keyDown(root, { key: "ArrowDown" });
    expect(document.activeElement).toBe(activity);
    expect(view.getByRole("status", { name: "Graph keyboard navigation" }).textContent).toBe(
      "transformation: Transform inputs. Relation: outgoing takes problem.",
    );

    fireEvent.keyDown(activity, { key: "ArrowDown" });
    expect(document.activeElement).toBe(answer);
    expect(view.getByRole("status", { name: "Graph keyboard navigation" }).textContent).toBe(
      "answer: Resulting state. Relation: outgoing produces answer.",
    );
  });

  it("switches among minimal, compact, and expanded card details", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      TEXT,
    );

    const view = within(container as HTMLElement);
    expect(container.querySelector(".ekphrasis-graph-node-details")).toBeNull();
    expect(container.querySelector(".ekphrasis-graph-node-status span")?.textContent).toBe(
      "Status",
    );
    fireEvent.change(view.getByLabelText("Card detail"), {
      target: { value: "minimal" },
    });
    const minimal = container.querySelector<HTMLElement>(".ekphrasis-graph-node");
    expect(minimal?.dataset.density).toBe("minimal");
    expect(minimal?.style.width).toBe("188px");
    expect(minimal?.querySelector(".ekphrasis-graph-node-status")).toBeNull();
    fireEvent.change(view.getByLabelText("Card detail"), {
      target: { value: "expanded" },
    });
    const details = container.querySelector(".ekphrasis-graph-node-details");
    expect(details?.textContent).toContain("CategoryArtifact");
    expect(container.querySelector(".ekphrasis-graph-node-family")?.textContent).toBe("synthesis");
    expect(details?.textContent).toContain("Identifierorigin");
    expect(container.querySelector(".ekphrasis-graph-node-status span")?.textContent).toBe(
      "Status · Lifecycle",
    );
  });

  it("switches to a condensed typed map with directed unlabelled edges", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": PROFILE_SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      PROFILE_TEXT,
    );

    const view = within(container as HTMLElement);
    fireEvent.change(view.getByLabelText("Layout"), {
      target: { value: "compact-network" },
    });

    const viewport = container.querySelector<HTMLElement>(".ekphrasis-graph-viewport");
    expect(viewport?.dataset.layoutStrategy).toBe("compact-network");
    expect(view.queryByLabelText("Card detail")).toBeNull();
    const challenge = container.querySelector<HTMLElement>("[data-kind='problem']");
    expect(challenge?.dataset.presentation).toBe("point");
    expect(challenge?.dataset.kindStyle).toBe("concern");
    expect(challenge?.style.width).toBe("132px");
    expect(challenge?.style.height).toBe("42px");
    expect(challenge?.querySelector(".ekphrasis-graph-map-node-dot")).not.toBeNull();
    expect(challenge?.querySelector(".ekphrasis-graph-map-node-label")?.textContent).toBe(
      "Starting state",
    );
    expect(challenge?.querySelector(".ekphrasis-graph-node-status")).toBeNull();
    const edges = container.querySelectorAll<SVGGElement>(".ekphrasis-graph-edge");
    expect(edges.length).toBeGreaterThan(0);
    for (const edge of Array.from(edges)) {
      expect(edge.querySelector(":scope > path")?.getAttribute("marker-end")).toContain(
        "ekphrasis-graph-",
      );
      expect(edge.querySelector("marker")).not.toBeNull();
      expect(edge.querySelector("text")).toBeNull();
    }
  });

  it("switches to a draggable network without losing the current scope", async () => {
    const { container } = await renderForm(
      new MemoryFileSource({ "graph.schema.yml": SCHEMA }),
      [{ pattern: "*.yml", schema: "graph.schema.yml" }],
      "view.yml",
      TEXT,
    );

    const view = within(container as HTMLElement);
    const viewport = container.querySelector<HTMLElement>(".ekphrasis-graph-viewport");
    expect(viewport?.dataset.layout).toBe("layered");
    if (viewport === null) throw new Error("Missing graph viewport");
    viewport.scrollLeft = 240;
    viewport.scrollTop = 180;
    fireEvent.change(view.getByLabelText("Layout"), {
      target: { value: "force-directed" },
    });
    expect(viewport?.dataset.layout).toBe("network");
    expect(viewport?.dataset.layoutStrategy).toBe("force-directed");
    expect(viewport.scrollLeft).toBe(0);
    expect(viewport.scrollTop).toBe(0);
    expect(view.getByLabelText<HTMLSelectElement>("Layout").value).toBe("force-directed");
    expect(container.querySelectorAll(".ekphrasis-graph-node")).toHaveLength(3);
    expect(
      container
        .querySelector("[data-selected='true'] .ekphrasis-graph-node-focus")
        ?.getAttribute("aria-pressed"),
    ).toBe("true");

    const root = container.querySelector<HTMLElement>("[data-root='true']");
    const status = root?.querySelector<HTMLElement>(".ekphrasis-graph-node-status");
    const networkPosition = root?.getAttribute("style");
    if (root === null || status === undefined || status === null) {
      throw new Error("Missing root card");
    }
    fireEvent.pointerDown(status, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(root, {
      pointerId: 1,
      clientX: 180,
      clientY: 150,
    });
    fireEvent.pointerUp(root, { pointerId: 1 });
    expect(root.getAttribute("style")).not.toBe(networkPosition);
    expect(view.getByText("reset node positions")).not.toBeNull();
    fireEvent.click(view.getByText("reset node positions"));
    expect(root.getAttribute("style")).toBe(networkPosition);

    fireEvent.change(view.getByLabelText("Layout"), {
      target: { value: "layered-directed" },
    });
    expect(viewport?.dataset.layout).toBe("layered");
    expect(viewport?.dataset.layoutStrategy).toBe("layered-directed");
    expect(container.querySelectorAll(".ekphrasis-graph-node")).toHaveLength(3);
    expect(view.getByText("show whole graph")).not.toBeNull();
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
