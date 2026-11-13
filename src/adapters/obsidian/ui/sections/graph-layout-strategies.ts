/** Renderer-owned graph layouts and the graph structures that they can present. */
import {
  layoutGraph,
  type GraphLayout,
  type GraphLayoutEdge,
  type GraphLayoutNode,
  type GraphLayoutOptions,
} from "./graph-layout";
import { layoutCompactNetwork, layoutNetwork } from "./graph-network-layout";

export type GraphStructureCapability = "nodes" | "directed-edges" | "declared-order";
export type GraphEdgeRouting = "layered" | "direct" | "point";
export type GraphLayoutViewport = "layered" | "network";
export type GraphNodePresentation = "card" | "point";

export interface GraphLayoutStrategy {
  readonly id: string;
  readonly title: string;
  readonly viewport: GraphLayoutViewport;
  readonly requires: readonly GraphStructureCapability[];
  readonly edgeRouting: GraphEdgeRouting;
  readonly nodePresentation: GraphNodePresentation;
  readonly edgeCaptions: boolean;
  readonly draggable: boolean;
  readonly layout: (
    nodes: readonly GraphLayoutNode[],
    edges: readonly GraphLayoutEdge[],
    options?: GraphLayoutOptions,
  ) => GraphLayout;
}

/** Holds trusted renderer implementations; graph data may select but cannot define them. */
export class GraphLayoutStrategyRegistry {
  readonly #strategies = new Map<string, GraphLayoutStrategy>();

  constructor(strategies: readonly GraphLayoutStrategy[]) {
    for (const strategy of strategies) {
      if (this.#strategies.has(strategy.id)) {
        throw new Error(`Duplicate graph layout strategy: ${strategy.id}`);
      }
      this.#strategies.set(strategy.id, strategy);
    }
  }

  get(id: string): GraphLayoutStrategy | null {
    return this.#strategies.get(id) ?? null;
  }

  resolve(
    ids: readonly string[],
    available: ReadonlySet<GraphStructureCapability>,
  ): readonly GraphLayoutStrategy[] {
    const resolved: GraphLayoutStrategy[] = [];
    const admitted = new Set<string>();
    for (const id of ids) {
      const strategy = this.#strategies.get(id);
      if (
        strategy === undefined ||
        admitted.has(id) ||
        strategy.requires.some((requirement) => !available.has(requirement))
      ) {
        continue;
      }
      admitted.add(id);
      resolved.push(strategy);
    }
    return resolved;
  }
}

export const BUILT_IN_GRAPH_LAYOUT_STRATEGIES = new GraphLayoutStrategyRegistry([
  {
    id: "layered-directed",
    title: "layered chronology",
    viewport: "layered",
    requires: ["nodes", "directed-edges"],
    edgeRouting: "layered",
    nodePresentation: "card",
    edgeCaptions: true,
    draggable: false,
    layout: layoutGraph,
  },
  {
    id: "force-directed",
    title: "network",
    viewport: "network",
    requires: ["nodes"],
    edgeRouting: "direct",
    nodePresentation: "card",
    edgeCaptions: true,
    draggable: true,
    layout: layoutNetwork,
  },
  {
    id: "compact-network",
    title: "map",
    viewport: "network",
    requires: ["nodes"],
    edgeRouting: "point",
    nodePresentation: "point",
    edgeCaptions: false,
    draggable: true,
    layout: layoutCompactNetwork,
  },
]);
