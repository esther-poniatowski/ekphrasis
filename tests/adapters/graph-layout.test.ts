import { describe, expect, it } from "vitest";
import { layoutGraph } from "../../src/adapters/obsidian/ui/sections/graph-layout";

describe("graph layout", () => {
  it("places a directed path in successive chronological rows", () => {
    const layout = layoutGraph(
      [
        { id: "root", root: true },
        { id: "activity", root: false },
        { id: "output", root: false },
      ],
      [
        { source: "root", target: "activity" },
        { source: "activity", target: "output" },
      ],
    );

    expect(layout.nodes.get("root")?.y).toBeLessThan(layout.nodes.get("activity")?.y ?? 0);
    expect(layout.nodes.get("activity")?.y).toBeLessThan(layout.nodes.get("output")?.y ?? 0);
    expect(layout.nodes.get("root")?.x).toBe(layout.nodes.get("activity")?.x);
    expect(layout.nodes.get("activity")?.x).toBe(layout.nodes.get("output")?.x);
  });

  it("places the incoming activity and source directly above a declared root", () => {
    const layout = layoutGraph(
      [
        { id: "problem", root: true },
        { id: "problematization", root: false },
        { id: "source", root: false },
        { id: "question", root: false },
      ],
      [
        { source: "source", target: "problematization" },
        { source: "problematization", target: "problem" },
        { source: "problem", target: "question" },
      ],
    );

    const route = ["source", "problematization", "problem", "question"].map((id) =>
      layout.nodes.get(id),
    );
    expect(route.every((node) => node?.x === route[0]?.x)).toBe(true);
    expect(route.map((node) => node?.y)).toEqual(
      [...route].map((node) => node?.y).sort((left, right) => (left ?? 0) - (right ?? 0)),
    );
  });

  it("terminates on a cycle and keeps every node", () => {
    const layout = layoutGraph(
      [
        { id: "a", root: true },
        { id: "b", root: false },
      ],
      [
        { source: "a", target: "b" },
        { source: "b", target: "a" },
      ],
    );

    expect([...layout.nodes]).toHaveLength(2);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
  });

  it("keeps a declared root route in the first column ahead of independent components", () => {
    const layout = layoutGraph(
      [
        { id: "unrelated", root: false },
        { id: "side", root: false },
        { id: "problem", root: true },
        { id: "question", root: false },
        { id: "answer", root: false },
        { id: "assessment", root: false },
      ],
      [
        { source: "unrelated", target: "side" },
        { source: "problem", target: "question" },
        { source: "question", target: "answer" },
        { source: "answer", target: "assessment" },
      ],
    );

    const route = ["problem", "question", "answer", "assessment"].map((id) => layout.nodes.get(id));
    expect(route.every((node) => node?.x === route[0]?.x)).toBe(true);
    expect(route.map((node) => node?.y)).toEqual(
      [...route].map((node) => node?.y).sort((left, right) => (left ?? 0) - (right ?? 0)),
    );
    expect(layout.nodes.get("unrelated")?.x).toBeGreaterThan(route[0]?.x ?? 0);
  });

  it("places parallel successors in distinct columns of the same chronological row", () => {
    const layout = layoutGraph(
      [
        { id: "root", root: true },
        { id: "first-question", root: false },
        { id: "second-question", root: false },
      ],
      [
        { source: "root", target: "first-question" },
        { source: "root", target: "second-question" },
      ],
    );

    expect(layout.nodes.get("first-question")?.y).toBe(layout.nodes.get("second-question")?.y);
    expect(layout.nodes.get("first-question")?.x).not.toBe(layout.nodes.get("second-question")?.x);
  });

  it("uses the requested card height without changing the branch columns", () => {
    const compact = layoutGraph(
      [
        { id: "root", root: true },
        { id: "answer", root: false },
      ],
      [{ source: "root", target: "answer" }],
      { nodeHeight: 100 },
    );
    const expanded = layoutGraph(
      [
        { id: "root", root: true },
        { id: "answer", root: false },
      ],
      [{ source: "root", target: "answer" }],
      { nodeHeight: 200 },
    );

    expect(compact.nodes.get("root")?.x).toBe(expanded.nodes.get("root")?.x);
    expect(compact.nodes.get("answer")?.x).toBe(expanded.nodes.get("answer")?.x);
    expect(compact.nodes.get("answer")?.y).toBeLessThan(expanded.nodes.get("answer")?.y ?? 0);
    expect(compact.height).toBeLessThan(expanded.height);
  });
});
