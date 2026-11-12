/**
 * Text of a message, in which each span between backticks displays as code.
 *
 * The messages of the inner layers mark paths, keys and keywords with backticks, as in
 * Markdown, so the interface can set them apart without parsing Markdown. A message that names
 * the settings of the plugin between asterisks, as the setup diagnostic does, displays those
 * names in italics when `emphasis` holds; other messages keep their asterisks unchanged.
 */
import type { JSX } from "preact";
import { codeSpans } from "../code-spans";

export function InlineText({
  text,
  emphasis = false,
}: {
  readonly text: string;
  readonly emphasis?: boolean;
}): JSX.Element {
  return (
    <>
      {codeSpans(text).map((span, index) =>
        span.code ? (
          <code key={index}>{span.text}</code>
        ) : emphasis ? (
          <Emphasized key={index} text={span.text} />
        ) : (
          span.text
        ),
      )}
    </>
  );
}

/** Text outside code spans, in which each span between single asterisks displays in italics. */
function Emphasized({ text }: { readonly text: string }): JSX.Element {
  const parts = text.split(/\*([^*]+)\*/);
  return <>{parts.map((part, index) => (index % 2 === 1 ? <em key={index}>{part}</em> : part))}</>;
}
