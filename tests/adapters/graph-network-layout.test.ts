import { describe, expect, it } from "vitest";
import {
  layoutCompactNetwork,
  layoutNetwork,
} from "../../src/adapters/obsidian/ui/sections/graph-network-layout";

const NODES = [
  { id: "problem", root: true },
  { id: "question", root: false },
  { id: "answer", root: false },
  { id: "assessment", root: false },
  { id: "source", root: false },
] as const;

const EDGES = [
  { source: "problem", target: "question" },
  { source: "question", target: "answer" },
  { source: "answer", target: "assessment" },
  { source: "source", target: "question" },
] as const;

describe("graph network layout", () => {
  it("produces deterministic positions inside a finite canvas", () => {
    const first = layoutNetwork(NODES, EDGES);
    const second = layoutNetwork(NODES, EDGES);

    expect([...first.nodes]).toEqual([...second.nodes]);
    expect(first.nodes).toHaveLength(NODES.length);
    const positions = [...first.nodes.values()];
    expect(Math.min(...positions.map((node) => node.x))).toBe(72);
    expect(Math.min(...positions.map((node) => node.y))).toBe(72);
    for (const node of first.nodes.values()) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThan(first.width);
      expect(node.y).toBeLessThan(first.height);
    }
  });

  it("keeps cards separated while drawing cycles and unknown endpoints safely", () => {
    const layout = layoutNetwork(
      NODES,
      [
        ...EDGES,
        { source: "assessment", target: "problem" },
        { source: "missing", target: "problem" },
      ],
      { nodeWidth: 264, nodeHeight: 132 },
    );
    const positions = [...layout.nodes.values()];

    for (let left = 0; left < positions.length; left += 1) {
      for (let right = left + 1; right < positions.length; right += 1) {
        const first = positions[left];
        const second = positions[right];
        if (first === undefined || second === undefined) continue;
        const separatedHorizontally = Math.abs(first.x - second.x) >= 264;
        const separatedVertically = Math.abs(first.y - second.y) >= 132;
        expect(separatedHorizontally || separatedVertically).toBe(true);
      }
    }
  });

  it("places the same graph on a smaller deterministic map", () => {
    const cardLayout = layoutNetwork(NODES, EDGES, { nodeWidth: 132, nodeHeight: 42 });
    const compact = layoutCompactNetwork(NODES, EDGES, { nodeWidth: 132, nodeHeight: 42 });

    expect([...compact.nodes]).toEqual([
      ...layoutCompactNetwork(NODES, EDGES, { nodeWidth: 132, nodeHeight: 42 }).nodes,
    ]);
    expect(compact.width).toBeLessThan(cardLayout.width);
    expect(compact.height).toBeLessThan(cardLayout.height);
  });
});
