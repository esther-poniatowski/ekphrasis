/**
 * Folded state of the groups and collections of one form: the keyword `x-collapsed` fixes the
 * state of each field when the form opens, a click on the heading of a field toggles it, and the
 * commands *Collapse all* and *Expand all* set every field at once.
 *
 * The state is keyed by the identity of each field, so a group keeps its state when the item
 * holding it moves. It belongs to the view of one file, and outlives each display of the form.
 */
export class FoldState {
  private readonly toggled = new Map<string, boolean>();
  /** State set for every field by the last command, or `null` to follow the schema. */
  private all: boolean | null = null;

  /** @param changed Called after each change, so the view displays the form again. */
  constructor(private readonly changed: () => void = () => {}) {}

  /** Whether the field of identity `uid` is folded, `initial` being its state at opening. */
  isFolded(uid: string, initial: boolean): boolean {
    return this.toggled.get(uid) ?? this.all ?? initial;
  }

  toggle(uid: string, initial: boolean): void {
    this.toggled.set(uid, !this.isFolded(uid, initial));
    this.changed();
  }

  /** Folds every field when `folded` holds, and else unfolds every field. */
  setAll(folded: boolean): void {
    this.toggled.clear();
    this.all = folded;
    this.changed();
  }

  /** Returns every field to the state that the schema fixes, for a newly opened file. */
  reset(): void {
    this.toggled.clear();
    this.all = null;
  }
}
