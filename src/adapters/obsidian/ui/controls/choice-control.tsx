/**
 * Dropdown, for the kind `choice`, committing at each change. Each option displays its title,
 * else its value, and the description of the selected option displays below the dropdown. The
 * empty option, marked `—`, stands for every unfilled value and clears the field. A filled value
 * outside the admitted values is added as a marked option, so the dropdown never hides what the
 * file holds.
 */
import type { JSX } from "preact";
import type { ScalarControlProps } from "../control-registry";
import type { ChoiceOption } from "../../../../domain";
import { formatScalar, UNFILLED_MARK } from "./scalar-format";

const UNSET = "";
const OUTSIDE = "outside";

export function ChoiceControl({ field, readOnly, onCommit }: ScalarControlProps): JSX.Element {
  const index = field.unfilled
    ? -1
    : field.options.findIndex((option) => option.value === field.value);
  const outside = !field.unfilled && index < 0;
  const selected = index >= 0 ? String(index) : outside ? OUTSIDE : UNSET;
  // A dropdown shows option tooltips on no platform reliably, so the description of the selected
  // option is displayed below it.
  const description = index >= 0 ? (field.options[index]?.description ?? null) : null;
  return (
    <>
      <select
        class="ekphrasis-control dropdown"
        value={selected}
        disabled={readOnly}
        onChange={(event) => {
          const choice = event.currentTarget.value;
          if (choice === OUTSIDE) return;
          const option = choice === UNSET ? undefined : field.options[Number(choice)];
          onCommit(option === undefined ? null : option.value);
        }}
      >
        <option value={UNSET}>{UNFILLED_MARK}</option>
        {outside && (
          <option value={OUTSIDE}>{`${formatScalar(field.value)} (not admitted)`}</option>
        )}
        {field.options.map((option, position) => (
          <option key={position} value={String(position)}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
      {description !== null && <div class="ekphrasis-option-description">{description}</div>}
    </>
  );
}

function optionLabel(option: ChoiceOption): string {
  const value = formatScalar(option.value);
  return option.title === null || option.title === value ? value : `${option.title} (${value})`;
}
