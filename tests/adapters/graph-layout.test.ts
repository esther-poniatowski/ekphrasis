import { describe, expect, it } from "vitest";
import { layoutGraph } from "../../src/adapters/obsidian/ui/sections/graph-layout";

describe("graph layout", () => {
  it("places a directed path in successive columns", () => {
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

    expect(layout.nodes.get("root")?.x).toBeLessThan(layout.nodes.get("activity")?.x ?? 0);
    expect(layout.nodes.get("activity")?.x).toBeLessThan(layout.nodes.get("output")?.x ?? 0);
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
});
