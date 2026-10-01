/**
 * Text of scalar values in the controls.
 */
import type { JsonValue, ScalarField, ScalarValue } from "../../../../domain";

/** Text displayed for `value`; the null value displays as an empty control. */
export function formatScalar(value: ScalarValue | JsonValue): string {
  if (value === null) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

/** Placeholder of an empty control: the first example of the field, when it has one. */
export function placeholderOf(field: ScalarField): string | undefined {
  const [example] = field.examples;
  return example === undefined ? undefined : formatScalar(example);
}
