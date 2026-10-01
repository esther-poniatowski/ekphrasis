/**
 * Toggle, for the kind `boolean`. A value that is not a boolean, such as a placeholder, displays
 * in a text input, so it stays visible as written.
 */
import type { JSX } from "preact";
import type { ControlProps } from "../control-registry";
import type { ScalarField } from "../../../../domain";
import { TextControl } from "./text-control";

export function BooleanControl(props: ControlProps<ScalarField>): JSX.Element {
  const { field, readOnly } = props;
  if (field.value !== null && typeof field.value !== "boolean") return <TextControl {...props} />;
  return (
    <input
      type="checkbox"
      class="ekphrasis-control-toggle"
      checked={field.value === true}
      disabled={readOnly}
      aria-label={field.label}
    />
  );
}
