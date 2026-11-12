/**
 * Spans of a message text, in which each span between backticks is code.
 *
 * The messages of the inner layers mark paths, keys and identifiers with backticks, as in
 * Markdown. Every surface that displays such a message, a form or a notice, splits it here, so
 * that no surface shows the backticks themselves.
 */
export interface TextSpan {
  readonly text: string;
  readonly code: boolean;
}

export function codeSpans(text: string): readonly TextSpan[] {
  // Splitting on a capturing group puts the code spans at the odd positions.
  return text.split(/`([^`]*)`/).map((part, index) => ({ text: part, code: index % 2 === 1 }));
}
