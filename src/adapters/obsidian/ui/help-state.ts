/**
 * Shown state of the instructions of the fields of one form: a click on the help button of a field
 * shows its instructions, a second click hides them, and the search of the outline shows the
 * instructions of the field it reaches.
 *
 * The state is keyed by a help key: the identity of a field, so its instructions stay shown when
 * the item holding it moves, or the identity of a table followed by the key of a column, since
 * the cells of a column share the instructions displayed under the header of the table. It
 * belongs to the view of one file, and outlives each display of the form.
 */
export class HelpState {
  private readonly shown = new Set<string>();

  /** @param changed Called after each change, so the view displays the form again. */
  constructor(private readonly changed: () => void = () => {}) {}

  isShown(key: string): boolean {
    return this.shown.has(key);
  }

  toggle(key: string): void {
    if (!this.shown.delete(key)) this.shown.add(key);
    this.changed();
  }

  /** Shows the instructions of the help key `key`, without hiding any other. */
  show(key: string): void {
    if (this.shown.has(key)) return;
    this.shown.add(key);
    this.changed();
  }

  /** Hides every instruction, for a newly opened file. */
  reset(): void {
    this.shown.clear();
  }
}

/** Help key of the column `column` of the table of identity `table`. */
export const columnHelpKey = (table: string, column: string): string => `${table}#${column}`;
