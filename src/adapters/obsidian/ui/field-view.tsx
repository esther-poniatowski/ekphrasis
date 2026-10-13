/**
 * Display of one field of the form model, through the control registered for its kind.
 */
import type { JSX } from "preact";
import type { Field } from "../../../domain";
import { FieldRow } from "./field-row";
import { useFormContext } from "./form-context";

export function FieldView({ field }: { readonly field: Field }): JSX.Element {
  const { registry, commit, errors } = useFormContext();
  const locked = field.lock !== null;
  if (field.mismatch !== null) {
    return (
      <FieldRow field={field}>
        <pre
          class="ekphrasis-yaml-text"
          title="This value does not have the shape the schema declares."
        >
          {field.mismatch}
        </pre>
      </FieldRow>
    );
  }
  switch (field.kind) {
    case "group":
    case "keyed-table":
    case "keyed-records":
    case "alternatives": {
      const Control = registry.mapping(field.kind);
      return <Control field={field} readOnly={locked} />;
    }
    case "choices":
    case "list":
    case "table":
    case "records": {
      const Control = registry.sequence(field.kind);
      return <Control field={field} readOnly={locked} />;
    }
    default: {
      const Control = registry.scalar(field.kind);
      return (
        <FieldRow field={field} error={errors.get(field.id) ?? null}>
          <Control
            field={field}
            readOnly={locked}
            onCommit={(value) => commit(field.path, value)}
          />
        </FieldRow>
      );
    }
  }
}
