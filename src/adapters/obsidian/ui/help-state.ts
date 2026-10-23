/**
 * Shown state of the instructions of the fields of one form: a click on the help button of a field
 * shows its instructions, a second click hides them, and the search of the outline shows the
 * instructions of the field it reaches. The command and the button showing or hiding every
 * instruction set the state of every field at once, and a later click toggles one field again.
 *
 * The state is keyed by a help key: the identity of a field, so its instructions stay shown when
 * the item holding it moves, or the identity of a table followed by the key of a column, since
 * the cells of a column share the instructions displayed under the header of the table. It
 * belongs to the view of one file, and outlives each display of the form.
 */
export class HelpState {
  /** State toggled for each help key since the last change of every key. */
  private readonly toggled = new Map<string, boolean>();
  /** State set for every help key by the last command; every instruction starts hidden. */
  private all = false;

  /** @param changed Called after each change, so the view displays the form again. */
  constructor(private readonly changed: () => void = () => {}) {}

  isShown(key: string): boolean {
    return this.toggled.get(key) ?? this.all;
  }

  /** Whether the last change of every help key showed the instructions. */
  get allShown(): boolean {
    return this.all;
  }

  toggle(key: string): void {
    this.toggled.set(key, !this.isShown(key));
    this.changed();
  }

  /** Shows the instructions of the help key `key`, without hiding any other. */
  show(key: string): void {
    if (this.isShown(key)) return;
    this.toggled.set(key, true);
    this.changed();
  }

  /** Shows the instructions of every help key when `shown` holds, and else hides them. */
  setAll(shown: boolean): void {
    this.toggled.clear();
    this.all = shown;
    this.changed();
  }

  /** Hides every instruction, for a newly opened file. */
  reset(): void {
    this.toggled.clear();
    this.all = false;
  }
}

/** Help key of the column `column` of the table of identity `table`. */
export const columnHelpKey = (table: string, column: string): string => `${table}#${column}`;
