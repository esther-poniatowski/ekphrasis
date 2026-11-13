/** Pure directional navigation over the visible nodes and relations of a graph. */

export type GraphNavigationDirection = "up" | "down" | "left" | "right";

export interface GraphNavigationNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface GraphNavigationEdge {
  readonly source: string;
  readonly target: string;
  readonly label: string;
}

export interface GraphNavigationTarget {
  readonly id: string;
  readonly relation: string;
}

interface Candidate extends GraphNavigationTarget {
  readonly primaryDistance: number;
  readonly crossDistance: number;
  readonly order: number;
}

/**
 * Move first through an incident relation in the requested direction, then fall back to the
 * nearest visible node. This keeps graph meaning primary without trapping a keyboard user at a
 * node whose relations do not cover every spatial direction.
 */
export function graphNavigationTarget(
  nodes: readonly GraphNavigationNode[],
  edges: readonly GraphNavigationEdge[],
  currentId: string,
  direction: GraphNavigationDirection,
): GraphNavigationTarget | null {
  const current = nodes.find((node) => node.id === currentId);
  if (current === undefined) return null;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incident = edges.flatMap((edge) => {
    const outgoing = edge.source === currentId;
    const incoming = edge.target === currentId;
    if (!outgoing && !incoming) return [];
    const id = outgoing ? edge.target : edge.source;
    const node = nodeById.get(id);
    if (node === undefined || node.id === currentId) return [];
    const value = candidate(
      current,
      node,
      direction,
      nodes.indexOf(node),
      `${outgoing ? "outgoing" : "incoming"} ${edge.label}`,
    );
    return value === null ? [] : [value];
  });
  const related = nearest(incident);
  if (related !== null) return related;
  return nearest(
    nodes.flatMap((node, order) => {
      if (node.id === currentId) return [];
      const value = candidate(current, node, direction, order, "");
      return value === null ? [] : [value];
    }),
  );
}

/** Order visible cards from the top-left to the bottom-right for Home and End. */
export function graphNavigationOrder(
  nodes: readonly GraphNavigationNode[],
): readonly GraphNavigationNode[] {
  return [...nodes].sort((left, right) => left.y - right.y || left.x - right.x);
}

function candidate(
  current: GraphNavigationNode,
  node: GraphNavigationNode,
  direction: GraphNavigationDirection,
  order: number,
  relation: string,
): Candidate | null {
  const deltaX = node.x - current.x;
  const deltaY = node.y - current.y;
  const vertical = direction === "up" || direction === "down";
  const forward =
    direction === "up"
      ? deltaY < 0
      : direction === "down"
        ? deltaY > 0
        : direction === "left"
          ? deltaX < 0
          : deltaX > 0;
  if (!forward) return null;
  return {
    id: node.id,
    relation,
    primaryDistance: Math.abs(vertical ? deltaY : deltaX),
    crossDistance: Math.abs(vertical ? deltaX : deltaY),
    order,
  };
}

function nearest(candidates: readonly Candidate[]): GraphNavigationTarget | null {
  const result = [...candidates].sort(
    (left, right) =>
      left.primaryDistance - right.primaryDistance ||
      left.crossDistance - right.crossDistance ||
      left.order - right.order,
  )[0];
  return result === undefined ? null : { id: result.id, relation: result.relation };
}
