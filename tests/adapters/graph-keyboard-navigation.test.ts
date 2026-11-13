import { describe, expect, it } from "vitest";
import {
  graphNavigationOrder,
  graphNavigationTarget,
  type GraphNavigationNode,
} from "../../src/adapters/obsidian/ui/sections/graph-keyboard-navigation";

const NODES: readonly GraphNavigationNode[] = [
  { id: "root", x: 0, y: 0 },
  { id: "unrelated", x: 0, y: 100 },
  { id: "related", x: 200, y: 200 },
  { id: "predecessor", x: 0, y: -100 },
];

describe("graph keyboard navigation", () => {
  it("prefers an incident relation over a closer unrelated card", () => {
    expect(
      graphNavigationTarget(
        NODES,
        [{ source: "root", target: "related", label: "yields" }],
        "root",
        "down",
      ),
    ).toEqual({ id: "related", relation: "outgoing yields" });
  });

  it("falls back to the nearest visible card in an uncovered direction", () => {
    expect(graphNavigationTarget(NODES, [], "root", "down")).toEqual({
      id: "unrelated",
      relation: "",
    });
  });

  it("identifies an incoming relation when moving to its source", () => {
    expect(
      graphNavigationTarget(
        NODES,
        [{ source: "predecessor", target: "root", label: "prepares" }],
        "root",
        "up",
      ),
    ).toEqual({ id: "predecessor", relation: "incoming prepares" });
  });

  it("orders Home and End targets from top-left to bottom-right", () => {
    expect(graphNavigationOrder(NODES).map((node) => node.id)).toEqual([
      "predecessor",
      "root",
      "unrelated",
      "related",
    ]);
  });

  it("returns no target for an absent current card", () => {
    expect(graphNavigationTarget(NODES, [], "missing", "right")).toBeNull();
  });
});
