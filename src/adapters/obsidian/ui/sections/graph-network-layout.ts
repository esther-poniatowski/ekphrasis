/** Deterministic force-directed layout for inspecting a graph as a connected network. */
import {
  GRAPH_NODE_WIDTH,
  type GraphLayout,
  type GraphLayoutEdge,
  type GraphLayoutNode,
  type PositionedNode,
} from "./graph-layout";

export interface NetworkLayoutOptions {
  readonly nodeWidth?: number;
  readonly nodeHeight?: number;
}

interface NetworkLayoutTuning {
  readonly margin: number;
  readonly horizontalSpace: number;
  readonly verticalSpace: number;
  readonly desiredEdgeLength: number;
  readonly repulsion: number;
  readonly spring: number;
  readonly centering: number;
  readonly damping: number;
  readonly maxVelocity: number;
  readonly collisionGap: number;
  readonly iterations: number;
}

interface SimulatedNode extends GraphLayoutNode {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

const DEFAULT_NODE_HEIGHT = 132;
const CARD_NETWORK: NetworkLayoutTuning = {
  margin: 72,
  horizontalSpace: 176,
  verticalSpace: 132,
  desiredEdgeLength: 330,
  repulsion: 28_000,
  spring: 0.018,
  centering: 0.002,
  damping: 0.82,
  maxVelocity: 14,
  collisionGap: 28,
  iterations: 180,
};
const COMPACT_NETWORK: NetworkLayoutTuning = {
  margin: 40,
  horizontalSpace: 48,
  verticalSpace: 48,
  desiredEdgeLength: 150,
  repulsion: 6_000,
  spring: 0.024,
  centering: 0.003,
  damping: 0.82,
  maxVelocity: 10,
  collisionGap: 8,
  iterations: 180,
};

/**
 * Places connected nodes near one another without interpreting their producer-defined kinds.
 * Stable identifier ordering and a fixed iteration count make the result reproducible.
 */
export function layoutNetwork(
  nodes: readonly GraphLayoutNode[],
  edges: readonly GraphLayoutEdge[],
  options: NetworkLayoutOptions = {},
): GraphLayout {
  return layoutForceDirectedNetwork(nodes, edges, options, CARD_NETWORK);
}

/** Places small labelled points closely enough to provide an Obsidian-like graph overview. */
export function layoutCompactNetwork(
  nodes: readonly GraphLayoutNode[],
  edges: readonly GraphLayoutEdge[],
  options: NetworkLayoutOptions = {},
): GraphLayout {
  return layoutForceDirectedNetwork(nodes, edges, options, COMPACT_NETWORK);
}

function layoutForceDirectedNetwork(
  nodes: readonly GraphLayoutNode[],
  edges: readonly GraphLayoutEdge[],
  options: NetworkLayoutOptions,
  tuning: NetworkLayoutTuning,
): GraphLayout {
  const nodeWidth = options.nodeWidth ?? GRAPH_NODE_WIDTH;
  const nodeHeight = options.nodeHeight ?? DEFAULT_NODE_HEIGHT;
  const count = Math.max(1, nodes.length);
  const columns = Math.max(2, Math.ceil(Math.sqrt(count * 1.6)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const width = tuning.margin * 2 + columns * nodeWidth + (columns - 1) * tuning.horizontalSpace;
  const height = tuning.margin * 2 + rows * nodeHeight + (rows - 1) * tuning.verticalSpace;
  if (nodes.length === 0) return { nodes: new Map(), width, height };

  const ordered = [...nodes].sort(
    (left, right) => Number(right.root) - Number(left.root) || left.id.localeCompare(right.id),
  );
  const simulated = ordered.map<SimulatedNode>((node, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const jitter = identifierJitter(node.id);
    return {
      ...node,
      x: tuning.margin + nodeWidth / 2 + column * (nodeWidth + tuning.horizontalSpace) + jitter.x,
      y: tuning.margin + nodeHeight / 2 + row * (nodeHeight + tuning.verticalSpace) + jitter.y,
      velocityX: 0,
      velocityY: 0,
    };
  });
  const indices = new Map(simulated.map((node, index) => [node.id, index]));
  const validEdges = edges.flatMap((edge) => {
    const source = indices.get(edge.source);
    const target = indices.get(edge.target);
    return source === undefined || target === undefined ? [] : [{ source, target }];
  });

  for (let iteration = 0; iteration < tuning.iterations; iteration += 1) {
    const forces = simulated.map(() => ({ x: 0, y: 0 }));
    for (let left = 0; left < simulated.length; left += 1) {
      for (let right = left + 1; right < simulated.length; right += 1) {
        applyRepulsion(simulated, forces, left, right, tuning.repulsion);
      }
    }
    for (const edge of validEdges) {
      applySpring(
        simulated,
        forces,
        edge.source,
        edge.target,
        tuning.desiredEdgeLength,
        tuning.spring,
      );
    }
    const centerX = width / 2;
    const centerY = height / 2;
    simulated.forEach((node, index) => {
      const force = forces[index];
      if (force === undefined) return;
      force.x += (centerX - node.x) * tuning.centering;
      force.y += (centerY - node.y) * tuning.centering;
      node.velocityX = bounded(
        (node.velocityX + force.x) * tuning.damping,
        -tuning.maxVelocity,
        tuning.maxVelocity,
      );
      node.velocityY = bounded(
        (node.velocityY + force.y) * tuning.damping,
        -tuning.maxVelocity,
        tuning.maxVelocity,
      );
      node.x = bounded(
        node.x + node.velocityX,
        tuning.margin + nodeWidth / 2,
        width - tuning.margin - nodeWidth / 2,
      );
      node.y = bounded(
        node.y + node.velocityY,
        tuning.margin + nodeHeight / 2,
        height - tuning.margin - nodeHeight / 2,
      );
    });
    separateCollisions(simulated, nodeWidth, nodeHeight, width, height, tuning);
  }

  const rawPositions = simulated.map((node) => ({
    id: node.id,
    x: node.x - nodeWidth / 2,
    y: node.y - nodeHeight / 2,
  }));
  const minimumX = Math.min(...rawPositions.map((node) => node.x));
  const minimumY = Math.min(...rawPositions.map((node) => node.y));
  const shiftX = tuning.margin - minimumX;
  const shiftY = tuning.margin - minimumY;
  const normalized = new Map(
    rawPositions.map((node) => [node.id, { x: node.x + shiftX, y: node.y + shiftY }]),
  );
  const positioned = new Map<string, PositionedNode>();
  for (const node of nodes) {
    const result = normalized.get(node.id);
    if (result === undefined) continue;
    positioned.set(node.id, {
      ...node,
      ...result,
    });
  }
  const displayedNodes = [...positioned.values()];
  const displayWidth =
    Math.max(...displayedNodes.map((node) => node.x + nodeWidth)) + tuning.margin;
  const displayHeight =
    Math.max(...displayedNodes.map((node) => node.y + nodeHeight)) + tuning.margin;
  return { nodes: positioned, width: displayWidth, height: displayHeight };
}

function applyRepulsion(
  nodes: readonly SimulatedNode[],
  forces: { x: number; y: number }[],
  left: number,
  right: number,
  repulsion: number,
): void {
  const leftNode = nodes[left];
  const rightNode = nodes[right];
  const leftForce = forces[left];
  const rightForce = forces[right];
  if (
    leftNode === undefined ||
    rightNode === undefined ||
    leftForce === undefined ||
    rightForce === undefined
  ) {
    return;
  }
  const delta = nonzeroDelta(leftNode, rightNode);
  const distanceSquared = delta.x * delta.x + delta.y * delta.y;
  const distance = Math.sqrt(distanceSquared);
  const force = repulsion / distanceSquared;
  const forceX = (delta.x / distance) * force;
  const forceY = (delta.y / distance) * force;
  leftForce.x -= forceX;
  leftForce.y -= forceY;
  rightForce.x += forceX;
  rightForce.y += forceY;
}

function applySpring(
  nodes: readonly SimulatedNode[],
  forces: { x: number; y: number }[],
  source: number,
  target: number,
  desiredEdgeLength: number,
  spring: number,
): void {
  const sourceNode = nodes[source];
  const targetNode = nodes[target];
  const sourceForce = forces[source];
  const targetForce = forces[target];
  if (
    sourceNode === undefined ||
    targetNode === undefined ||
    sourceForce === undefined ||
    targetForce === undefined
  ) {
    return;
  }
  const delta = nonzeroDelta(sourceNode, targetNode);
  const distance = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
  const force = (distance - desiredEdgeLength) * spring;
  const forceX = (delta.x / distance) * force;
  const forceY = (delta.y / distance) * force;
  sourceForce.x += forceX;
  sourceForce.y += forceY;
  targetForce.x -= forceX;
  targetForce.y -= forceY;
}

function separateCollisions(
  nodes: SimulatedNode[],
  nodeWidth: number,
  nodeHeight: number,
  width: number,
  height: number,
  tuning: NetworkLayoutTuning,
): void {
  for (let left = 0; left < nodes.length; left += 1) {
    for (let right = left + 1; right < nodes.length; right += 1) {
      const leftNode = nodes[left];
      const rightNode = nodes[right];
      if (leftNode === undefined || rightNode === undefined) continue;
      const delta = nonzeroDelta(leftNode, rightNode);
      const overlapX = nodeWidth + tuning.collisionGap - Math.abs(delta.x);
      const overlapY = nodeHeight + tuning.collisionGap - Math.abs(delta.y);
      if (overlapX <= 0 || overlapY <= 0) continue;
      if (overlapX < overlapY) {
        const shift = (overlapX / 2) * Math.sign(delta.x);
        leftNode.x -= shift;
        rightNode.x += shift;
      } else {
        const shift = (overlapY / 2) * Math.sign(delta.y);
        leftNode.y -= shift;
        rightNode.y += shift;
      }
      leftNode.x = bounded(
        leftNode.x,
        tuning.margin + nodeWidth / 2,
        width - tuning.margin - nodeWidth / 2,
      );
      rightNode.x = bounded(
        rightNode.x,
        tuning.margin + nodeWidth / 2,
        width - tuning.margin - nodeWidth / 2,
      );
      leftNode.y = bounded(
        leftNode.y,
        tuning.margin + nodeHeight / 2,
        height - tuning.margin - nodeHeight / 2,
      );
      rightNode.y = bounded(
        rightNode.y,
        tuning.margin + nodeHeight / 2,
        height - tuning.margin - nodeHeight / 2,
      );
    }
  }
}

function nonzeroDelta(
  left: Pick<SimulatedNode, "id" | "x" | "y">,
  right: Pick<SimulatedNode, "id" | "x" | "y">,
): { readonly x: number; readonly y: number } {
  const x = right.x - left.x;
  const y = right.y - left.y;
  if (x !== 0 || y !== 0) return { x, y };
  return left.id < right.id ? { x: 1, y: 0 } : { x: -1, y: 0 };
}

function identifierJitter(id: string): { readonly x: number; readonly y: number } {
  let hash = 2_166_136_261;
  for (const character of id) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return {
    x: ((hash >>> 0) % 41) - 20,
    y: (((hash >>> 8) >>> 0) % 41) - 20,
  };
}

function bounded(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
