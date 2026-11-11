/** Fields of a mapping, its way to reveal an absent optional property, then its extra keys. */
import type { JSX } from "preact";
import type { Field, MappingField, YamlPath } from "../../../../domain";
import { FieldView } from "../field-view";
import { useFormContext } from "../form-context";
import { ExtraEntries } from "./extra-entries";
import { ActionButton } from "./item-actions";

export function FieldList({
  field,
  readOnly = false,
}: {
  readonly field: MappingField;
  readonly readOnly?: boolean;
}): JSX.Element {
  const { constraints, issues, optionalFields, reveal } = useFormContext();
  const isCurrent = (child: Field): boolean =>
    child.required ||
    child.node !== null ||
    optionalFields.isShown(child.uid) ||
    constraints.requires(child.id) ||
    issues.countWithin(child.path) > 0;
  const displayed = field.children.filter(isCurrent);
  const available = field.children.filter(
    (child) => !isCurrent(child) && child.node === null && child.lock === null,
  );
  return (
    <>
      {displayed.map((child) => (
        <FieldView
          key={child.id}
          field={child}
          actions={
            !readOnly && isOptionalDraft(child, optionalFields.isShown(child.uid)) ? (
              <ActionButton
                label={`Discard ${child.label}`}
                symbol="✕"
                onClick={() => optionalFields.hide(child.uid)}
              />
            ) : null
          }
        />
      ))}
      {!readOnly && available.length > 0 && (
        <OptionalFieldAdder parent={field} fields={available} onChoose={reveal} />
      )}
      <ExtraEntries entries={field.extraEntries} />
    </>
  );
}

/** Whether `field` is an optional draft that can be hidden without changing the source. */
function isOptionalDraft(field: Field, shown: boolean): boolean {
  return shown && !field.required && field.node === null && field.lock === null;
}

/** Selector revealing one absent optional property of `parent` as a draft. */
function OptionalFieldAdder({
  parent,
  fields,
  onChoose,
}: {
  readonly parent: MappingField;
  readonly fields: readonly Field[];
  readonly onChoose: (path: YamlPath) => void;
}): JSX.Element {
  return (
    <select
      class="dropdown ekphrasis-optional-field-adder"
      aria-label={
        parent.id === "" ? "Add an optional field" : `Add an optional field to ${parent.label}`
      }
      value=""
      onChange={(event) => {
        const field = fields.find((candidate) => candidate.uid === event.currentTarget.value);
        if (field !== undefined) onChoose(field.path);
      }}
    >
      <option value="">+ Add a field</option>
      {fields.map((field) => (
        <option key={field.uid} value={field.uid}>
          {field.label}
        </option>
      ))}
    </select>
  );
}
