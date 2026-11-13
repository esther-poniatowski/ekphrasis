/** Deterministic layered layout for a directed graph, including graphs that contain cycles. */

export interface GraphLayoutNode {
  readonly id: string;
  readonly root: boolean;
}

export interface GraphLayoutEdge {
  readonly source: string;
  readonly target: string;
}

export interface PositionedNode extends GraphLayoutNode {
  readonly x: number;
  readonly y: number;
}

export interface GraphLayout {
  readonly nodes: ReadonlyMap<string, PositionedNode>;
  readonly width: number;
  readonly height: number;
}

export interface GraphLayoutOptions {
  readonly nodeWidth?: number;
  readonly nodeHeight?: number;
}

const NODE_WIDTH = 264;
const NODE_HEIGHT = 152;
const COLUMN_GAP = 96;
const ROW_GAP = 56;
const MARGIN = 48;

/**
 * Places the unvisited ancestors of declared roots above them, then traverses their descendants
 * before independent components. The first-reach rule terminates on cycles, keeps a root's primary
 * route in the first column, and preserves producer order within each row.
 */
export function layoutGraph(
  nodes: readonly GraphLayoutNode[],
  edges: readonly GraphLayoutEdge[],
  options: GraphLayoutOptions = {},
): GraphLayout {
  const nodeWidth = options.nodeWidth ?? NODE_WIDTH;
  const nodeHeight = options.nodeHeight ?? NODE_HEIGHT;
  const known = new Set(nodes.map((node) => node.id));
  const outgoing = new Map<string, string[]>();
  const predecessors = new Map<string, string[]>();
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    if (!known.has(edge.source) || !known.has(edge.target)) continue;
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
    predecessors.set(edge.target, [...(predecessors.get(edge.target) ?? []), edge.source]);
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  }
  const ranks = new Map<string, number>();
  const discoveryOrder = new Map<string, number>();
  let nextDiscovery = 0;
  const remember = (id: string, rank: number): void => {
    ranks.set(id, rank);
    discoveryOrder.set(id, nextDiscovery);
    nextDiscovery += 1;
  };
  const placeAncestors = (seeds: readonly string[]): void => {
    const queue = [...seeds];
    for (const seed of seeds) if (!ranks.has(seed)) remember(seed, 0);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const target = queue[cursor];
      if (target === undefined) continue;
      const previousRank = (ranks.get(target) ?? 0) - 1;
      for (const source of predecessors.get(target) ?? []) {
        if (ranks.has(source)) continue;
        remember(source, previousRank);
        queue.push(source);
      }
    }
  };
  const placeDescendants = (seeds: readonly string[]): void => {
    const queue: string[] = [];
    for (const seed of seeds) {
      if (!ranks.has(seed)) remember(seed, 0);
      queue.push(seed);
    }
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const source = queue[cursor];
      if (source === undefined) continue;
      const nextRank = (ranks.get(source) ?? 0) + 1;
      for (const target of outgoing.get(source) ?? []) {
        if (ranks.has(target)) continue;
        remember(target, nextRank);
        queue.push(target);
      }
    }
  };
  const roots = nodes.filter((node) => node.root).map((node) => node.id);
  placeAncestors(roots);
  placeDescendants(roots);
  for (const node of nodes.filter((item) => incoming.get(item.id) === 0)) {
    if (!ranks.has(node.id)) placeDescendants([node.id]);
  }
  for (const node of nodes) if (!ranks.has(node.id)) placeDescendants([node.id]);

  const columns = new Map<number, number>();
  const positioned = new Map<string, PositionedNode>();
  const orderedNodes = [...nodes].sort(
    (left, right) => (discoveryOrder.get(left.id) ?? 0) - (discoveryOrder.get(right.id) ?? 0),
  );
  const minimumRank = Math.min(0, ...ranks.values());
  for (const node of orderedNodes) {
    const rank = (ranks.get(node.id) ?? 0) - minimumRank;
    const column = columns.get(rank) ?? 0;
    columns.set(rank, column + 1);
    positioned.set(node.id, {
      ...node,
      x: MARGIN + column * (nodeWidth + COLUMN_GAP),
      y: MARGIN + rank * (nodeHeight + ROW_GAP),
    });
  }
  const maxRank = Math.max(0, ...ranks.values()) - minimumRank;
  const maxColumns = Math.max(1, ...columns.values());
  return {
    nodes: positioned,
    width: MARGIN * 2 + maxColumns * nodeWidth + (maxColumns - 1) * COLUMN_GAP,
    height: MARGIN * 2 + (maxRank + 1) * nodeHeight + maxRank * ROW_GAP,
  };
}

export const GRAPH_NODE_WIDTH = NODE_WIDTH;
export const GRAPH_NODE_HEIGHT = NODE_HEIGHT;
