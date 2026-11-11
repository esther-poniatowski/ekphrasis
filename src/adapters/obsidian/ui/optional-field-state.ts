/**
 * Absent optional fields selected for display in one open instance. A selection is a draft:
 * it changes no source text, and the first commit inside the field writes its key. The state
 * belongs to the instance view and is reset when that view opens another file.
 */
export class OptionalFieldState {
  private readonly shown = new Set<string>();

  /** @param changed Called after a selection changes, so the form displays again. */
  constructor(private readonly changed: () => void = () => {}) {}

  /** Whether the absent field of identity `uid` was selected for display. */
  isShown(uid: string): boolean {
    return this.shown.has(uid);
  }

  /** Displays the fields of `uids`, without changing fields that are already displayed. */
  show(uids: string | readonly string[]): void {
    const values = typeof uids === "string" ? [uids] : uids;
    let added = false;
    for (const uid of values) {
      if (this.shown.has(uid)) continue;
      this.shown.add(uid);
      added = true;
    }
    if (added) this.changed();
  }

  /** Hides one absent draft field and every draft nested below it. */
  hide(uid: string): void {
    let removed = false;
    for (const shown of [...this.shown]) {
      if (shown !== uid && !shown.startsWith(`${uid}.`) && !shown.startsWith(`${uid}[`)) continue;
      this.shown.delete(shown);
      removed = true;
    }
    if (removed) this.changed();
  }

  /** Forgets every draft when the view opens another file. */
  reset(): void {
    this.shown.clear();
  }
}
