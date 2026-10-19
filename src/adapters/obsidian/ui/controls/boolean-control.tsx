/**
 * Toggle, for the kind `boolean`, committing at each change. An unfilled value displays as a
 * toggle turned off and followed by the mark `—`, since a toggle has no empty state. A filled
 * value that is not a boolean displays in a text input, so it stays visible as written.
 */
import type { JSX } from "preact";
import type { ScalarControlProps } from "../control-registry";
import { UNFILLED_MARK } from "./scalar-format";
import { TextControl } from "./text-control";

export function BooleanControl(props: ScalarControlProps): JSX.Element {
  const { field, readOnly, onCommit } = props;
  if (!field.unfilled && typeof field.value !== "boolean") return <TextControl {...props} />;
  return (
    <>
      <input
        type="checkbox"
        class="ekphrasis-control-toggle"
        checked={field.value === true}
        disabled={readOnly}
        aria-label={field.label}
        onChange={(event) => onCommit(event.currentTarget.checked)}
      />
      {field.unfilled && <span class="ekphrasis-unfilled-mark">{UNFILLED_MARK}</span>}
    </>
  );
}
