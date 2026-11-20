/**
 * Text of scalar values in the controls.
 */
import type {
  ChoiceOption,
  JsonValue,
  ScalarField,
  ScalarKind,
  ScalarValue,
} from "../../../../domain";

/** Text displayed for `value`; the null value displays as an empty control. */
export function formatScalar(value: ScalarValue | JsonValue): string {
  if (value === null) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

/** Mark of an empty control, distinct from any value that a field admits. */
export const UNFILLED_MARK = "—";

/** Value that the control of `field` displays: `null`, an empty control, when it is unfilled. */
export function displayedValue(field: ScalarField): ScalarValue {
  return field.unfilled ? null : field.value;
}

/** Expected form of the text of a kind whose values follow a fixed syntax. */
const EXPECTED_FORMS: ReadonlyMap<ScalarKind, string> = new Map([
  ["date", "YYYY-MM-DD"],
  ["duration", "ISO 8601, such as PT1H30M"],
]);

/**
 * Placeholder of an empty control: the mark of an empty control, followed by the first example
 * of the field when it has one, and else by the expected form of the text of its kind.
 */
export function placeholderOf(field: ScalarField): string {
  const [example] = field.examples;
  const hint = example === undefined ? EXPECTED_FORMS.get(field.kind) : formatScalar(example);
  return hint === undefined ? UNFILLED_MARK : `${UNFILLED_MARK} ${hint}`;
}

/** Label of an admitted value: its title followed by the value, or the value alone. */
export function optionLabel(option: ChoiceOption): string {
  const value = formatScalar(option.value);
  return option.title === null || option.title === value ? value : `${option.title} (${value})`;
}
