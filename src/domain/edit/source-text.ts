/**
 * Positions in the source text of an instance: lines, columns, the colon after a key, and the
 * comments of a region that holds no scalar text.
 */

const isBlank = (char: string): boolean => char === " " || char === "\t";

export class SourceText {
  constructor(readonly text: string) {}

  get length(): number {
    return this.text.length;
  }

  /** Offset of the first character of the line holding `offset`. */
  lineStart(offset: number): number {
    return this.text.lastIndexOf("\n", offset - 1) + 1;
  }

  /** Offset of the line break ending the line holding `offset`, or the length of the text. */
  lineEnd(offset: number): number {
    const end = this.text.indexOf("\n", offset);
    return end < 0 ? this.text.length : end;
  }

  /** Offset of the start of the line after the one holding `offset`, or the length of the text. */
  nextLineStart(offset: number): number {
    const end = this.lineEnd(offset);
    return end < this.text.length ? end + 1 : end;
  }

  /** Column of `offset`, counted in characters from the start of its line. */
  column(offset: number): number {
    return offset - this.lineStart(offset);
  }

  /** Whether only spaces and tabs precede `offset` on its line. */
  startsLine(offset: number): boolean {
    return this.text.slice(this.lineStart(offset), offset).trim() === "";
  }

  /** Offset of the first space or tab of the run that ends at `offset`, on the same line. */
  blankRunStart(offset: number): number {
    let start = offset;
    while (start > 0 && isBlank(this.text.charAt(start - 1))) start -= 1;
    return start;
  }

  /** Whether the text from `offset` to the end of its line holds only spaces and tabs. */
  restOfLineBlank(offset: number): boolean {
    return this.text.slice(offset, this.lineEnd(offset)).trim() === "";
  }

  /**
   * Offset of the colon that follows a key ending at `keyEnd` on the same line, or `null` when
   * none does, as for an explicit key written with `?`.
   */
  colonAfter(keyEnd: number): number | null {
    let offset = keyEnd;
    while (isBlank(this.text.charAt(offset))) offset += 1;
    return this.text.charAt(offset) === ":" ? offset : null;
  }

  /**
   * Comments of the region `[start, end)`, without their line breaks. The region must hold no
   * scalar text, so a hash sign at its start or after a space or a tab opens a comment.
   */
  commentsIn(start: number, end: number): string[] {
    const comments: string[] = [];
    let offset = start;
    while (offset < end) {
      const hash = this.text.indexOf("#", offset);
      if (hash < 0 || hash >= end) break;
      const lineEnd = Math.min(this.lineEnd(hash), end);
      if (
        hash === start ||
        isBlank(this.text.charAt(hash - 1)) ||
        this.text.charAt(hash - 1) === "\n"
      ) {
        comments.push(this.text.slice(hash, lineEnd).trimEnd());
        offset = lineEnd;
      } else {
        offset = hash + 1;
      }
    }
    return comments;
  }
}
