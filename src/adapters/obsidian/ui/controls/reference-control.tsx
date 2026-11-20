/**
 * Control of the kind `reference`: a text input suggesting the identifiers of the entries that
 * the field may name, read from the records of the vault. The suggestions use the element
 * `datalist`, so the platform filters them by the typed text, and the input still admits any
 * text: a value naming an entry not declared yet is saved as typed, and its issue displays below
 * the control. Until the records are read, the input suggests nothing.
 */
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import type { ScalarControlProps } from "../control-registry";
import { useFormContext } from "../form-context";
import { TextInput } from "./text-control";
import { useTextDraft } from "./use-text-draft";

/**
 * Counter of the lists of suggestions. The identifier of a list must be unique in the document,
 * which holds every open form, so it is drawn from one counter rather than from the position of
 * the control in its form.
 */
let lists = 0;

export function ReferenceControl({ field, readOnly, onCommit }: ScalarControlProps): JSX.Element {
  const draft = useTextDraft(field, onCommit);
  const { references } = useFormContext();
  const [listId] = useState(() => {
    lists += 1;
    return `ekphrasis-entries-${lists}`;
  });
  const entries = readOnly || field.reference === null ? null : references(field.reference);
  return (
    <>
      <TextInput
        field={field}
        readOnly={readOnly}
        draft={draft}
        spellcheck={false}
        list={entries === null ? undefined : listId}
      />
      {entries !== null && (
        <datalist id={listId}>
          {entries.identifiers.map((identifier) => (
            <option key={identifier} value={identifier} />
          ))}
        </datalist>
      )}
    </>
  );
}
