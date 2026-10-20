/**
 * Mode of the view of an instance: the form view or the source view, as the feature note on the
 * form view specifies.
 *
 * The mode displayed is the mode chosen by the author, else the source view for a file bound to
 * no schema, else the form view. A source view chosen by the author holds when another file opens
 * in the same pane, so an author editing YAML text moves from file to file in that view. A source
 * view displayed for another reason, for an unbound file or after a failure of the form pipeline,
 * ends with its file.
 */
export type ViewMode = "form" | "source";

export const isViewMode = (value: unknown): value is ViewMode =>
  value === "form" || value === "source";

export class ModeChoice {
  /** Mode chosen by the author for the open file, or `null` to follow the binding. */
  private chosen: ViewMode | null = null;
  /** Mode imposed on the open file by a failure of the form pipeline, which ends with the file. */
  private forced: ViewMode | null = null;
  /** Whether the author chose the source view, which then holds for the next file. */
  private sourceKept = false;
  /** Mode restored from the workspace, applied when its file loads. */
  private restored: ViewMode | null = null;

  /** Mode displayed for a file that is unbound when `unbound` holds. */
  displayed(unbound: boolean): ViewMode {
    return this.forced ?? this.chosen ?? (unbound ? "source" : "form");
  }

  /** Mode chosen by the author, recorded in the workspace and passed to `restore` on reopening. */
  get recorded(): ViewMode | null {
    return this.chosen;
  }

  /** Records the mode `mode` chosen by the author. */
  choose(mode: ViewMode): void {
    this.chosen = mode;
    this.forced = null;
    this.sourceKept = mode === "source";
  }

  /** Displays `mode` for the open file only, after a failure of the form pipeline. */
  force(mode: ViewMode): void {
    this.forced = mode;
  }

  /** Records the mode restored from the workspace, applied by the next call of `fileOpened`. */
  restore(mode: ViewMode): void {
    this.restored = mode;
  }

  /** Mode of a file that opens in the pane: the restored mode, else a kept source view. */
  fileOpened(): void {
    this.forced = null;
    if (this.restored !== null) {
      this.choose(this.restored);
      this.restored = null;
    } else {
      this.chosen = this.sourceKept ? "source" : null;
    }
  }
}
