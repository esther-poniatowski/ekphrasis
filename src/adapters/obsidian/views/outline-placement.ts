/**
 * Placement of the outline in the workspace: the plugin opens the outline in the right sidebar
 * when it loads, beside the outline and the backlinks of Obsidian, so the outline follows the
 * active form without a command. A workspace restored from a previous session already holds the
 * leaf of the outline, so no second leaf opens.
 *
 * The workspace is read through the two operations below, which the workspace of Obsidian
 * provides, so unit tests place the outline in a workspace of their own.
 */
import { OUTLINE_VIEW_TYPE } from "../constants";

/** Leaf of the workspace, as the placement of the outline uses it. */
export interface PlacedLeaf {
  setViewState(state: { readonly type: string; readonly active: boolean }): Promise<void>;
}

/** Workspace, as the placement of the outline reads it. */
export interface OutlineWorkspace<L extends PlacedLeaf> {
  getLeavesOfType(type: string): L[];
  /** Leaf of the right sidebar, created when `split` holds or when the sidebar holds no leaf. */
  getRightLeaf(split: boolean): L | null;
}

/**
 * Leaf holding the outline: the first leaf already holding it, or else a new leaf of the right
 * sidebar, opened without taking the focus. Returns `null` when the workspace offers no leaf in
 * the right sidebar.
 */
export async function placeOutline<L extends PlacedLeaf>(
  workspace: OutlineWorkspace<L>,
): Promise<L | null> {
  const existing = workspace.getLeavesOfType(OUTLINE_VIEW_TYPE)[0];
  if (existing !== undefined) return existing;
  const leaf = workspace.getRightLeaf(false);
  if (leaf === null) return null;
  await leaf.setViewState({ type: OUTLINE_VIEW_TYPE, active: false });
  return leaf;
}
