/**
 * Channel between the views of instances and the outline: the outline follows the active view of
 * an instance, and displays its form again at each change of that form or of its focused field.
 *
 * The active view of an instance stays the source of the outline while another view, such as the
 * outline itself, is active, so a click in the outline acts on the form it displays.
 */
import type { FormReady } from "../../../application";
import type { YamlPath } from "../../../domain";

/** View of an instance, as the outline reads and moves it. */
export interface OutlineSource {
  /** Path of the open file, which keys the state of the outline. */
  readonly filePath: string | null;
  /** Latest form of the instance, or `null` when the instance has no form. */
  readonly form: FormReady | null;
  /** Printed field path of the field holding the focus in the form, or `null`. */
  readonly focusedId: string | null;
  /**
   * Moves the form to the field at `path`, unfolding the sections containing it, and shows its
   * instructions when `showHelp` holds.
   */
  reveal(path: YamlPath, showHelp: boolean): void;
}

export class OutlineChannel {
  private active: OutlineSource | null = null;
  private readonly listeners = new Set<() => void>();

  get source(): OutlineSource | null {
    return this.active;
  }

  /** Calls `listener` at each change of the source or of its form, until the returned call. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Makes `source` the source of the outline, as when its view becomes active. */
  activate(source: OutlineSource): void {
    if (this.active === source) return;
    this.active = source;
    this.emit();
  }

  /** Reports a change of the form or of the focused field of `source`. */
  changed(source: OutlineSource): void {
    if (this.active === source) this.emit();
  }

  /** Removes `source`, as when its view closes. */
  release(source: OutlineSource): void {
    if (this.active !== source) return;
    this.active = null;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
