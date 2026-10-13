/**
 * Multi-line input, for the kind `markdown`.
 */
import type { JSX } from "preact";
import type { ScalarControlProps } from "../control-registry";
import { placeholderOf } from "./scalar-format";
import { useTextDraft } from "./use-text-draft";

/** Bounds on the number of visible lines, so a short value stays compact and a long one scrolls. */
const MIN_ROWS = 2;
const MAX_ROWS = 12;

export function TextareaControl({ field, readOnly, onCommit }: ScalarControlProps): JSX.Element {
  const draft = useTextDraft(field, onCommit);
  const rows = Math.min(MAX_ROWS, Math.max(MIN_ROWS, draft.text.split("\n").length));
  return (
    <textarea
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
