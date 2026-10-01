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
  return (
    <select class="ekphrasis-control dropdown" value={selected} disabled={readOnly}>
      {field.value === null && <option value={UNSET} />}
      {outside && <option value="outside">{`${formatScalar(field.value)} (not admitted)`}</option>}
      {field.options.map((option, position) => (
        <option key={position} value={String(position)} title={option.description ?? undefined}>
          {optionLabel(option)}
        </option>
      ))}
    </select>
  );
}

function optionLabel(option: ChoiceOption): string {
  const value = formatScalar(option.value);
  return option.title === null || option.title === value ? value : `${option.title} (${value})`;
}
