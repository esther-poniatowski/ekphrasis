/**
 * Display of one field of the form model, through the control registered for its kind.
 *
 * A field forbidden by a rule `forbidden-when` under the current values is disabled while it is
 * unfilled. A forbidden field that still holds a value stays editable, so the author can clear
 * it, and its issue displays like any other; once cleared, the field is disabled.
 */
import type { ComponentChildren, JSX } from "preact";
import type { Field } from "../../../domain";
import { useDisabling } from "./disabled-note";
import { FieldRow } from "./field-row";
import { useFormContext } from "./form-context";

export function FieldView({
  field,
  actions = null,
}: {
  readonly field: Field;
  /** Actions of the field as an item or an entry of its collection, such as moving it. */
  readonly actions?: ComponentChildren;
}): JSX.Element {
  const { registry, commit, errors } = useFormContext();
  const disabled = useDisabling(field) !== null;
  const locked = field.lock !== null || disabled;
  if (field.mismatch !== null) {
    return (
      <FieldRow field={field} actions={actions}>
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
      return <Control field={field} readOnly={locked} actions={actions} />;
    }
    case "choices":
    case "list":
    case "table":
    case "records": {
      const Control = registry.sequence(field.kind);
      return <Control field={field} readOnly={locked} actions={actions} />;
    }
    default: {
      const Control = registry.scalar(field.kind);
      return (
        <FieldRow field={field} error={errors.get(field.id) ?? null} actions={actions}>
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
