/**
 * Multi-line input, the editor of the kind `markdown`.
 */
import type { JSX } from "preact";
import { placeholderOf } from "./scalar-format";
import type { EditorProps } from "./text-control";

/** Bounds on the number of visible lines, so a short value stays compact and a long one scrolls. */
const MIN_ROWS = 2;
const MAX_ROWS = 12;

export function TextArea({ field, readOnly, draft, inputRef }: EditorProps): JSX.Element {
  const rows = Math.min(MAX_ROWS, Math.max(MIN_ROWS, draft.text.split("\n").length));
  return (
    <textarea
      ref={inputRef ?? null}
      class="ekphrasis-control"
      value={draft.text}
      rows={rows}
      placeholder={placeholderOf(field)}
      readOnly={readOnly}
      onFocus={draft.onFocus}
      onBlur={draft.onBlur}
      onInput={(event) => draft.onInput(event.currentTarget.value)}
    />
  );
}
