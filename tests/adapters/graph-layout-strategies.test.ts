import { describe, expect, it } from "vitest";
import { layoutGraph } from "../../src/adapters/obsidian/ui/sections/graph-layout";
import {
  BUILT_IN_GRAPH_LAYOUT_STRATEGIES,
  GraphLayoutStrategyRegistry,
  type GraphLayoutStrategy,
  type GraphStructureCapability,
} from "../../src/adapters/obsidian/ui/sections/graph-layout-strategies";

const DIRECTED = new Set<GraphStructureCapability>(["nodes", "directed-edges"]);

describe("graph layout strategy registry", () => {
  it("resolves registered compatible strategies in producer order", () => {
    expect(
      BUILT_IN_GRAPH_LAYOUT_STRATEGIES.resolve(
        [
          "force-directed",
          "unknown-layout",
          "compact-network",
          "layered-directed",
          "force-directed",
        ],
        DIRECTED,
      ).map((strategy) => strategy.id),
    ).toEqual(["force-directed", "compact-network", "layered-directed"]);
  });

  it("rejects a strategy whose required graph structure is absent", () => {
    const ordered: GraphLayoutStrategy = {
      id: "ordered-diagram",
      title: "Ordered diagram",
      viewport: "layered",
      requires: ["declared-order"],
      edgeRouting: "layered",
      nodePresentation: "card",
      edgeCaptions: true,
      draggable: false,
      layout: layoutGraph,
    };
    const registry = new GraphLayoutStrategyRegistry([ordered]);

    expect(registry.resolve(["ordered-diagram"], DIRECTED)).toEqual([]);
    expect(
      registry
        .resolve(
          ["ordered-diagram"],
          new Set<GraphStructureCapability>([...DIRECTED, "declared-order"]),
        )
        .map((strategy) => strategy.id),
    ).toEqual(["ordered-diagram"]);
  });

  it("rejects duplicate strategy registrations", () => {
    const layered = BUILT_IN_GRAPH_LAYOUT_STRATEGIES.get("layered-directed");
    expect(layered).not.toBeNull();
    expect(() => new GraphLayoutStrategyRegistry([layered!, layered!])).toThrow(
      "Duplicate graph layout strategy: layered-directed",
    );
  });
});
