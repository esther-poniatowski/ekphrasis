/**
 * Draft of a control that holds text: the text displayed, and whether it holds an edit that is
 * not yet committed.
 *
 * The draft follows the value of its field, with two exceptions. First, a draft holding an edit
 * not yet committed keeps it through a change of the file made outside, so the edit is committed
 * to the same field of the new text. Second, a focused draft keeps a text that reads as the new
 * value of its field, such as `1.50` for the number 1.5, so a commit made while typing never
 * rewrites the text under the cursor. Once the draft loses the focus, such a text is displayed
 * as the value is written, `1.5`.
 *
 * The class depends on no interface library, so unit tests exercise it outside Obsidian.
 */
import type { ScalarValue } from "../../../../domain";
import { formatScalar } from "./scalar-format";

/** Value taken from a draft for a commit. */
export interface TakenValue {
  readonly value: ScalarValue;
}

export class TextDraft {
  private text: string;
  private value: ScalarValue;
  private dirty = false;
  private focused = false;

  /**
   * @param value Value of the field when the control is created.
   * @param read Value that a text typed in the control stands for.
   */
  constructor(
    value: ScalarValue,
    private readonly read: (text: string) => ScalarValue,
  ) {
    this.value = value;
    this.text = formatScalar(value);
  }

  get displayed(): string {
    return this.text;
  }

  /** Whether the draft holds an edit not yet committed. */
  get uncommitted(): boolean {
    return this.dirty;
  }

  /** Records the text `text`, typed by the author. */
  input(text: string): void {
    this.text = text;
    this.dirty = true;
  }

  focus(): void {
    this.focused = true;
  }

  /**
   * Ends the focus. A text without uncommitted edit that reads as the value of the field is then
   * displayed as that value is written; the text of a refused commit, which reads as another
   * value, stays displayed.
   */
  blur(): void {
    this.focused = false;
    if (!this.dirty && this.read(this.text) === this.value) this.text = formatScalar(this.value);
  }

  /**
   * Value to commit, or `null` when the draft holds no edit since the last commit. Taking the
   * value marks the draft as committed, whatever the outcome of the commit: a refused commit
   * leaves its text displayed, beside the reason that the form shows.
   */
  take(): TakenValue | null {
    if (!this.dirty) return null;
    this.dirty = false;
    return { value: this.read(this.text) };
  }

  /**
   * Follows the value `value` of the field, after a commit or a change made outside. Only a
   * change of the value replaces the text, so the text of a refused commit stays displayed.
   */
  update(value: ScalarValue): void {
    if (value === this.value) return;
    this.value = value;
    if (this.dirty) return;
    if (this.focused && this.read(this.text) === value) return;
    this.text = formatScalar(value);
  }
}
