/**
 * Placement of the outline when the plugin loads: a new leaf of the right sidebar opens the
 * outline without taking the focus, unless a leaf restored with the workspace already holds it.
 */
import { describe, expect, it } from "vitest";
import { OUTLINE_VIEW_TYPE } from "../../src/adapters/obsidian/constants";
import {
  placeOutline,
  type OutlineWorkspace,
  type PlacedLeaf,
} from "../../src/adapters/obsidian/views/outline-placement";

/** Leaf recording the view states set on it. */
class Leaf implements PlacedLeaf {
  readonly states: { type: string; active: boolean }[] = [];

  setViewState(state: { type: string; active: boolean }): Promise<void> {
    this.states.push(state);
    return Promise.resolve();
  }
}

/** Workspace holding the leaves `existing`, whose right sidebar offers `right`. */
function workspace(existing: Leaf[], right: Leaf | null) {
  const requests: string[] = [];
  const space: OutlineWorkspace<Leaf> = {
    getLeavesOfType: (type) => {
      requests.push(type);
      return existing;
    },
    getRightLeaf: () => right,
  };
  return { space, requests };
}

describe("placement of the outline", () => {
  it("opens the outline in a leaf of the right sidebar, without the focus", async () => {
    const right = new Leaf();
    const { space, requests } = workspace([], right);
    expect(await placeOutline(space)).toBe(right);
    expect(requests).toEqual([OUTLINE_VIEW_TYPE]);
    expect(right.states).toEqual([{ type: OUTLINE_VIEW_TYPE, active: false }]);
  });

  it("keeps the leaf already holding the outline, and opens no other", async () => {
    const restored = new Leaf();
    const right = new Leaf();
    const { space } = workspace([restored], right);
    expect(await placeOutline(space)).toBe(restored);
    expect([restored.states, right.states]).toEqual([[], []]);
  });

  it("opens nothing when the workspace offers no leaf in the right sidebar", async () => {
    const { space } = workspace([], null);
    expect(await placeOutline(space)).toBeNull();
  });
});
