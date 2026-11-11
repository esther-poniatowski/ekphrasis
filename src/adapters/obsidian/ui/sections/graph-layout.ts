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

const NODE_WIDTH = 264;
const NODE_HEIGHT = 152;
const COLUMN_GAP = 96;
const ROW_GAP = 56;
const MARGIN = 48;

/**
 * Places roots and nodes without predecessors in the first column, then assigns each unplaced
 * target to the column after the first placed predecessor that reaches it. The first-reach rule
 * terminates on cycles and preserves producer order within each column.
 */
export function layoutGraph(
  nodes: readonly GraphLayoutNode[],
  edges: readonly GraphLayoutEdge[],
): GraphLayout {
  const known = new Set(nodes.map((node) => node.id));
  const outgoing = new Map<string, string[]>();
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    if (!known.has(edge.source) || !known.has(edge.target)) continue;
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  }
  const ranks = new Map<string, number>();
  const queue = nodes
    .filter((node) => node.root || incoming.get(node.id) === 0)
    .map((node) => node.id);
  for (const id of queue) ranks.set(id, 0);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const source = queue[cursor];
    if (source === undefined) continue;
    const nextRank = (ranks.get(source) ?? 0) + 1;
    for (const target of outgoing.get(source) ?? []) {
      if (ranks.has(target)) continue;
      ranks.set(target, nextRank);
      queue.push(target);
    }
  }
  for (const node of nodes) if (!ranks.has(node.id)) ranks.set(node.id, 0);

  const rows = new Map<number, number>();
  const positioned = new Map<string, PositionedNode>();
  for (const node of nodes) {
    const rank = ranks.get(node.id) ?? 0;
    const row = rows.get(rank) ?? 0;
    rows.set(rank, row + 1);
    positioned.set(node.id, {
      ...node,
      x: MARGIN + rank * (NODE_WIDTH + COLUMN_GAP),
      y: MARGIN + row * (NODE_HEIGHT + ROW_GAP),
    });
  }
  const maxRank = Math.max(0, ...ranks.values());
  const maxRows = Math.max(1, ...rows.values());
  return {
    nodes: positioned,
    width: MARGIN * 2 + (maxRank + 1) * NODE_WIDTH + maxRank * COLUMN_GAP,
    height: MARGIN * 2 + maxRows * NODE_HEIGHT + (maxRows - 1) * ROW_GAP,
  };
}

export const GRAPH_NODE_WIDTH = NODE_WIDTH;
export const GRAPH_NODE_HEIGHT = NODE_HEIGHT;
