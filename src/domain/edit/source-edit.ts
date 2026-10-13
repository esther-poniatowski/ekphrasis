/**
 * Edits of the source text of an instance, as the domain plans them.
 *
 * The domain fixes where each edit applies, the scalar style and the indentation of each written
 * value, and the surrounding text; the YAML writer of the infrastructure produces the text of
 * each scalar, and applies the edits. A plan is plain data, so unit tests inspect it directly.
 */
import type { ScalarStyle, SourceRange } from "../model";
import type { ScalarContext } from "./scalar-style";

/**
 * Number of spaces by which a nested block is indented under the line of its key. The YAML
 * writer indents the lines of a block scalar written after a key by the same step.
 */
export const INDENT_STEP = 2;

/** Scalar whose text the YAML writer produces, in a selected style at a known position. */
export interface ScalarText {
  readonly text: string;
  readonly style: ScalarStyle;
  readonly context: ScalarContext;
  /**
   * Indentation of the line holding the scalar. A new block scalar written after a key indents
   * its lines one step further; a rewritten token keeps the indentation recorded in its token.
   */
  readonly indent: number;
}

/**
 * Part of the text of a scalar. A block scalar written into an empty value is split, so that a
 * comment after the key stays on the line of the key: its header line follows the colon, and its
 * body starts on the next line. For a scalar that is not a block scalar, the header is the whole
 * text and the body is empty.
 */
export interface ScalarPart {
  readonly scalar: ScalarText;
  readonly piece: "whole" | "header" | "body";
}

export type TextPart = string | ScalarPart;

/** Replacement of the text in `range` by the concatenation of `parts`; an empty range inserts. */
export interface TextSplice {
  readonly kind: "splice";
  readonly range: SourceRange;
  readonly parts: readonly TextPart[];
}

/**
 * Rewrite of the scalar token starting at `offset` with a new value. The token keeps its
 * comments and its indentation, as the decision on source-preserving writes requires.
 */
export interface ScalarRewrite {
  readonly kind: "rewrite";
  readonly offset: number;
  readonly scalar: ScalarText;
}

export type SourceEdit = TextSplice | ScalarRewrite;

export const scalarPart = (
  scalar: ScalarText,
  piece: ScalarPart["piece"] = "whole",
): ScalarPart => ({
  scalar,
  piece,
});

export const splice = (start: number, end: number, parts: readonly TextPart[]): TextSplice => ({
  kind: "splice",
  range: { start, end },
  parts,
});
