/**
 * Dropdown, for the kind `choice`. Each option displays its title, else its value, and its
 * description as a tooltip. A value outside the admitted values, such as a placeholder, is
 * added as a marked option, so the dropdown never hides what the file holds.
 */
import type { JSX } from "preact";
import type { ControlProps } from "../control-registry";
import type { ChoiceOption, ScalarField } from "../../../../domain";
import { formatScalar } from "./scalar-format";

const UNSET = "";

export function ChoiceControl({ field, readOnly }: ControlProps<ScalarField>): JSX.Element {
  const index = field.options.findIndex((option) => option.value === field.value);
  const outside = field.value !== null && index < 0;
  const selected = index >= 0 ? String(index) : outside ? "outside" : UNSET;
  // A dropdown shows option tooltips on no platform reliably, so the description of the selected
  // option is displayed below it.
  const description = index >= 0 ? (field.options[index]?.description ?? null) : null;
  return (
    <>
      <select class="ekphrasis-control dropdown" value={selected} disabled={readOnly}>
        {field.value === null && <option value={UNSET} />}
        {outside && (
          <option value="outside">{`${formatScalar(field.value)} (not admitted)`}</option>
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
