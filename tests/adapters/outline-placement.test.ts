/**
 * Placement of the outline when the plugin loads: a new leaf of the right sidebar opens the
 * outline without taking the focus, unless a leaf restored with the workspace already holds it,
 * and only at the first load, as the data of the plugin records it.
 */
import { describe, expect, it } from "vitest";
import { OUTLINE_VIEW_TYPE } from "../../src/adapters/obsidian/constants";
import {
  OUTLINE_PLACED_KEY,
  outlinePlacedIn,
  placeOutline,
  placeOutlineAtFirstLoad,
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

describe("placement of the outline at the first load", () => {
  it("places the outline, then records the placement", async () => {
    const right = new Leaf();
    const { space } = workspace([], right);
    let recorded = 0;
    const record = (): Promise<void> => {
      recorded += 1;
      return Promise.resolve();
    };
    expect(await placeOutlineAtFirstLoad(space, false, record)).toBe(right);
    expect(recorded).toBe(1);
  });

  it("opens nothing after an earlier placement, so a closed outline stays closed", async () => {
    const right = new Leaf();
    const { space, requests } = workspace([], right);
    expect(
      await placeOutlineAtFirstLoad(space, true, () => Promise.reject(new Error())),
    ).toBeNull();
    expect([requests, right.states]).toEqual([[], []]);
  });

  it("records nothing when the workspace offers no leaf, so the next load tries again", async () => {
    const { space } = workspace([], null);
    let recorded = false;
    await placeOutlineAtFirstLoad(space, false, () => {
      recorded = true;
      return Promise.resolve();
    });
    expect(recorded).toBe(false);
  });

  it("reads the record of the placement from the stored data, absent or malformed as none", () => {
    expect([
      outlinePlacedIn({ [OUTLINE_PLACED_KEY]: true }),
      outlinePlacedIn({ [OUTLINE_PLACED_KEY]: "yes" }),
      outlinePlacedIn({}),
      outlinePlacedIn(null),
    ]).toEqual([true, false, false, false]);
  });
});
