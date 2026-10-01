/**
 * Single-line input, for the kinds `label`, `text`, `markdown-line` and `latex`, and for any
 * scalar value that the control of its kind cannot hold.
 */
import type { JSX } from "preact";
import type { ControlProps } from "../control-registry";
import type { ScalarField } from "../../../../domain";
import { formatScalar, placeholderOf } from "./scalar-format";

export function TextControl({ field, readOnly }: ControlProps<ScalarField>): JSX.Element {
  return (
    <input
      type="text"
      class="ekphrasis-control"
      value={formatScalar(field.value)}
      placeholder={placeholderOf(field)}
      readOnly={readOnly}
      spellcheck={field.kind !== "label" && field.kind !== "latex"}
    />
  );
}
