/**
 * Checkboxes, for the kind `choices`: one checkbox per admitted value, checked when the sequence
 * holds the value. Checking a box inserts the value at its place in the order of the admitted
 * values, and unchecking it removes the item; each change commits at once. A value outside the
 * admitted values displays as a checked box marked as not admitted, so it can be removed.
 */
import type { JSX } from "preact";
import type { ChoiceOption, ScalarValue, SequenceField } from "../../../../domain";
import type { ControlProps } from "../control-registry";
import { FieldRow } from "../field-row";
import { useFormContext } from "../form-context";
import { IssueList } from "../issue-list";
import { formatScalar } from "./scalar-format";

export function ChoicesControl({
  field,
  readOnly,
  actions,
}: ControlProps<SequenceField>): JSX.Element {
  const { edit, errors, issues } = useFormContext();
  const next = field.next;
  const options: readonly ChoiceOption[] = next !== null && "options" in next ? next.options : [];
  const values: ScalarValue[] = field.items.map((item) => ("value" in item ? item.value : null));
  const rank = (value: ScalarValue): number => {
    const index = options.findIndex((option) => option.value === value);
    return index < 0 ? options.length : index;
  };
  const toggle = (value: ScalarValue, checked: boolean): void => {
    if (checked) {
      const following = values.findIndex((present) => rank(present) > rank(value));
      const index = following < 0 ? values.length : following;
      edit({ kind: "insert-item", path: field.path, index, value });
      return;
    }
    const item = field.items[values.indexOf(value)];
    if (item !== undefined) edit({ kind: "remove-item", path: item.path });
  };
  const outside = values.filter((value) => rank(value) === options.length);
  return (
    <FieldRow field={field} error={errors.get(field.id) ?? null} actions={actions ?? null}>
      <div class="ekphrasis-choices">
        {options.map((option, index) => (
          <label key={index} class="ekphrasis-choice">
            <input
              type="checkbox"
              checked={values.includes(option.value)}
              disabled={readOnly}
              onChange={(event) => toggle(option.value, event.currentTarget.checked)}
            />
            {option.title === null ? formatScalar(option.value) : option.title}
          </label>
        ))}
        {outside.map((value, index) => (
          <label key={`outside-${index}`} class="ekphrasis-choice">
            <input
              type="checkbox"
              checked={true}
              disabled={readOnly}
              onChange={() => toggle(value, false)}
            />
            {`${formatScalar(value)} (not admitted)`}
          </label>
        ))}
      </div>
      {field.items.map((item) => (
        <IssueList key={item.key} issues={issues.at(item.id)} />
      ))}
    </FieldRow>
  );
}
