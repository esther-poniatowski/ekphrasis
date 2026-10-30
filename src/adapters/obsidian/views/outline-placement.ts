/**
 * Placement of the outline in the workspace: the plugin opens the outline in the right sidebar
 * at its first load, beside the outline and the backlinks of Obsidian, so the outline follows the
 * active form without a command. The data of the plugin records that first placement. Afterwards
 * the workspace restored by Obsidian decides, as for its own panels: it holds the leaf of the
 * outline unless the author closed it, and the command *Show outline* opens it again.
 *
 * The workspace is read through the two operations below, which the workspace of Obsidian
 * provides, so unit tests place the outline in a workspace of their own.
 */
import { OUTLINE_VIEW_TYPE } from "../constants";

/** Key of the data of the plugin recording that the outline was placed at an earlier load. */
export const OUTLINE_PLACED_KEY = "outlinePlaced";

/** Whether `raw`, the stored data of the plugin, records that the outline was placed. */
export function outlinePlacedIn(raw: unknown): boolean {
  return (
    typeof raw === "object" &&
    raw !== null &&
    (raw as Record<string, unknown>)[OUTLINE_PLACED_KEY] === true
  );
}

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

/**
 * Placement of the outline at the first load of the plugin: places the outline unless `placed`
 * records an earlier placement, then calls `record` once a leaf holds the outline. Returns the
 * leaf, or `null` when no placement ran or the workspace offered no leaf.
 */
export async function placeOutlineAtFirstLoad<L extends PlacedLeaf>(
  workspace: OutlineWorkspace<L>,
  placed: boolean,
  record: () => Promise<void>,
): Promise<L | null> {
  if (placed) return null;
  const leaf = await placeOutline(workspace);
  if (leaf !== null) await record();
  return leaf;
}
