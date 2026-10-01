/**
 * Text of a message, in which each span between backticks displays as code.
 *
 * The messages of the inner layers mark paths, keys and keywords with backticks, as in
 * Markdown, so the interface can set them apart without parsing Markdown.
 */
import type { JSX } from "preact";

export function InlineText({ text }: { readonly text: string }): JSX.Element {
  // Splitting on a capturing group puts the code spans at the odd positions.
  const parts = text.split(/`([^`]*)`/);
  return (
    <>{parts.map((part, index) => (index % 2 === 1 ? <code key={index}>{part}</code> : part))}</>
  );
}
