/**
 * Cell of a table holding a field of kind `list`. The items display as one summary, one token per
 * item in the order of the file, so the row keeps the height of a line of tokens rather than one
 * row per item. An empty list displays the mark of an unfilled value.
 *
 * In an editable cell, the summary is a button: its activation opens, below the summary, the
 * control that a row of the form displays for the list, and a second activation closes it. A
 * read-only or disabled cell displays the summary alone, so it offers no control.
 *
 * Each token carries the field path of its item, so a move of the form to an item reaches its
 * token, and the token carries the mark of the issues of its item. While the control is closed,
 * the issues of the list and of its items display below the summary.
 */
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { isScalarKind, type Field, type ScalarField, type SequenceField } from "../../../../domain";
import {
  displayedValue,
  formatScalar,
  optionLabel,
  UNFILLED_MARK,
} from "../controls/scalar-format";
import { DisabledNote, useDisabling } from "../disabled-note";
import { FieldView } from "../field-view";
import { useFormContext } from "../form-context";
import { fieldMark, IssueList } from "../issue-list";

export function CellList({
  field,
  readOnly,
}: {
  readonly field: SequenceField;
  readonly readOnly: boolean;
}): JSX.Element {
  const { issues, errors } = useFormContext();
  const disabling = useDisabling(field);
  const [open, setOpen] = useState(false);
  const editable = !readOnly && disabling === null;
  const shown = [field, ...field.items].flatMap((place) => issues.at(place.id));
  const error = errors.get(field.id) ?? null;
  const toggle = (): void => setOpen((current) => !current);
  return (
    <div class="ekphrasis-table-cell" data-issue={fieldMark(shown) ?? undefined}>
      <div
        class="ekphrasis-control ekphrasis-cell-list"
        role={editable ? "button" : undefined}
        tabIndex={editable ? 0 : undefined}
        aria-label={editable ? `Edit ${field.label}` : undefined}
        aria-expanded={editable ? open : undefined}
        aria-readonly={!editable}
        onClick={editable ? toggle : undefined}
        onKeyDown={(event) => {
          if (!editable || (event.key !== "Enter" && event.key !== " ")) return;
          event.preventDefault();
          toggle();
        }}
      >
        {field.items.length === 0 ? (
          <span class="ekphrasis-cell-empty">{UNFILLED_MARK}</span>
        ) : (
          <ul class="ekphrasis-cell-items">
            {field.items.map((item) => (
              <li
                key={item.key}
                class="ekphrasis-cell-item"
                data-path={item.id}
                data-issue={fieldMark(issues.at(item.id)) ?? undefined}
              >
                {itemText(item)}
              </li>
            ))}
          </ul>
        )}
      </div>
      {editable && open ? (
        <FieldView field={field} />
      ) : (
        <>
          {error !== null && (
            <div class="ekphrasis-commit-error" role="alert">
              {error}
            </div>
          )}
          <IssueList issues={shown} />
        </>
      )}
      <DisabledNote field={field} constraint={disabling} />
    </div>
  );
}

/**
 * Text of the token of `item`: the label of its admitted value as its dropdown displays it, its
 * value, the mark of an unfilled value, or the source text of a value of another shape.
 */
function itemText(item: Field): string {
  if (item.mismatch !== null) return item.mismatch.trim();
  if (!isScalarKind(item.kind)) return "";
  const scalar = item as ScalarField;
  const value = displayedValue(scalar);
  if (value === null) return UNFILLED_MARK;
  const option = scalar.options.find((candidate) => candidate.value === value);
  return option === undefined ? formatScalar(value) : optionLabel(option);
}
