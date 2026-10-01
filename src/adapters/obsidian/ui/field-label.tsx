/**
 * Label of a field, with the markers of a required field and of a locked value.
 */
import type { JSX } from "preact";
import type { Field, FieldLock } from "../../../domain";

const LOCK_TITLES: Readonly<Record<FieldLock, string>> = {
  alias: "This value comes from an anchor elsewhere in the file; edit it at its anchor.",
  merge: "This value is merged from another mapping by the key <<; edit it in that mapping.",
};

export function FieldLabel({ field }: { readonly field: Field }): JSX.Element {
  return (
    <div class="ekphrasis-field-label" title={field.id}>
      <span>{field.label}</span>
      {field.required && (
        <span class="ekphrasis-required" aria-label="required">
          *
        </span>
      )}
      {field.lock !== null && (
        <span class="ekphrasis-lock" title={LOCK_TITLES[field.lock]}>
          {field.lock}
        </span>
      )}
    </div>
  );
}
