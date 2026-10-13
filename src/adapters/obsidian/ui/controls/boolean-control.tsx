/**
 * Toggle, for the kind `boolean`, committing at each change. A value that is not a boolean, such
 * as a placeholder, displays in a text input, so it stays visible as written.
 */
import type { JSX } from "preact";
import type { ScalarControlProps } from "../control-registry";
import { TextControl } from "./text-control";

export function BooleanControl(props: ScalarControlProps): JSX.Element {
  const { field, readOnly, onCommit } = props;
  if (field.value !== null && typeof field.value !== "boolean") return <TextControl {...props} />;
  return (
    <input
      type="checkbox"
      class="ekphrasis-control-toggle"
      checked={field.value === true}
      disabled={readOnly}
      aria-label={field.label}
      onChange={(event) => onCommit(event.currentTarget.checked)}
    />
  );
}
