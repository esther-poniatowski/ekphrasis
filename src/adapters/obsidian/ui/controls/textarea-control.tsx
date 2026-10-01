/**
 * Multi-line input, for the kind `markdown`.
 */
import type { JSX } from "preact";
import type { ControlProps } from "../control-registry";
import type { ScalarField } from "../../../../domain";
import { formatScalar, placeholderOf } from "./scalar-format";

/** Bounds on the number of visible lines, so a short value stays compact and a long one scrolls. */
const MIN_ROWS = 2;
const MAX_ROWS = 12;

export function TextareaControl({ field, readOnly }: ControlProps<ScalarField>): JSX.Element {
  const text = formatScalar(field.value);
  const rows = Math.min(MAX_ROWS, Math.max(MIN_ROWS, text.split("\n").length));
  return (
    <textarea
      class="ekphrasis-control"
      value={text}
      rows={rows}
      placeholder={placeholderOf(field)}
      readOnly={readOnly}
    />
  );
}
