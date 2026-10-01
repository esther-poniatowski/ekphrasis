/**
 * Numeric input, for the kind `number`. A value that is not a number, such as a placeholder,
 * displays in a text input, so it stays visible as written.
 */
import type { JSX } from "preact";
import type { ControlProps } from "../control-registry";
import type { ScalarField } from "../../../../domain";
import { formatScalar, placeholderOf } from "./scalar-format";
import { TextControl } from "./text-control";

export function NumberControl(props: ControlProps<ScalarField>): JSX.Element {
  const { field, readOnly } = props;
  if (field.value !== null && typeof field.value !== "number") return <TextControl {...props} />;
  return (
    <input
      type="number"
      class="ekphrasis-control"
      value={formatScalar(field.value)}
      placeholder={placeholderOf(field)}
      readOnly={readOnly}
    />
  );
}
