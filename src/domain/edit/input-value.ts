/**
 * Value committed by a control that holds text, read according to the kind of its field.
 */
import type { ScalarKind } from "../form/kinds";
import type { ScalarValue } from "../model";

/** Decimal number as typed in a control: digits, an optional fraction and exponent. */
const NUMBER = /^[-+]?(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][-+]?[0-9]+)?$/;

/**
 * Value of the text `text` typed in the control of a field of kind `kind`. The empty text clears
 * the field. A field of kind `number` reads a decimal number as a number, and a field of kind
 * `boolean` reads `true` and `false` as booleans; any other text is committed as typed, since
 * validation never blocks saving.
 */
export function valueFromText(kind: ScalarKind, text: string): ScalarValue {
  if (text === "") return null;
  if (kind === "number") {
    const trimmed = text.trim();
    const number = Number(trimmed);
    if (NUMBER.test(trimmed) && Number.isFinite(number)) return number;
  }
  if (kind === "boolean" && (text === "true" || text === "false")) return text === "true";
  return text;
}
