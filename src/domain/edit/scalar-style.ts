/**
 * Scalar styles of committed values: whether a style can represent a value at its position, and
 * the style selected for a new or edited value, following the feature note on saving.
 *
 * A plain scalar must read back as the same string under both YAML 1.2, which the plugin parses,
 * and YAML 1.1, which the Python checkers of the consumer projects commonly parse. Therefore, a
 * text that either version resolves to a null, a boolean, a number or a date is never plain.
 */
import type { ScalarStyle } from "../model";

/**
 * Syntactic position of a scalar, which decides the styles it admits:
 *
 * - `after-key`: the value of a key in a block mapping, whose block scalar is indented further;
 * - `block`: another position in block context, such as an item of a block sequence;
 * - `flow`: inside a collection written between brackets or braces, where no block scalar is
 *   admitted and the characters `,[]{}` end a plain scalar;
 * - `key`: an implicit key, written on one line.
 */
export type ScalarContext = "after-key" | "block" | "flow" | "key";

/** Value written by a commit, the null value excepted, since it is written as an empty value. */
export type WrittenValue = string | number | boolean;

/** Null, boolean, number and date literals of the YAML 1.2 core schema and of YAML 1.1. */
const NON_STRING_LITERALS: readonly RegExp[] = [
  /^(?:~|null|Null|NULL)$/,
  /^(?:true|True|TRUE|false|False|FALSE|yes|Yes|YES|no|No|NO|on|On|ON|off|Off|OFF|y|Y|n|N)$/,
  // Integers in base 2, 8, 10 and 16, with the underscores and sexagesimal form of YAML 1.1.
  /^[-+]?(?:0b[01_]+|0o?[0-7_]+|0x[0-9a-fA-F_]+|[0-9][0-9_]*(?::[0-5]?[0-9])*)$/,
  /^[-+]?(?:[0-9][0-9_]*(?:\.[0-9_]*)?|\.[0-9][0-9_]*)(?:[eE][-+]?[0-9]+)?$/,
  /^[-+]?\.(?:inf|Inf|INF)$|^\.(?:nan|NaN|NAN)$/,
  /^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}(?:[Tt ].*)?$/,
  // The value key `=` and the merge key `<<` of YAML 1.1.
  /^(?:=|<<)$/,
];

/** Characters that start a reserved construction at the start of a plain scalar. */
const RESERVED_FIRST = new Set([..."[]{},#&*!|>'\"%@`"]);

/** Characters that end a plain scalar inside a flow collection. */
const FLOW_INDICATORS = /[,[\]{}]/;

/** Characters other than the tab and the line feed, which no quoted single line can hold. */
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f﻿]/;

/** Whether `text` is read back as the same string when written plain at a scalar of `context`. */
export function isPlainSafe(text: string, context: ScalarContext): boolean {
  if (text === "" || text.trim() !== text) return false;
  if (/[\n\r\t]/.test(text) || CONTROL.test(text)) return false;
  const first = text.charAt(0);
  if (RESERVED_FIRST.has(first)) return false;
  // An indicator `-`, `?` or `:` followed by a space, or alone, starts a construction.
  if ("-?:".includes(first) && (text.length === 1 || text.charAt(1) === " ")) return false;
  if (text.startsWith("---") || text.startsWith("...")) return false;
  if (text.includes(": ") || text.endsWith(":") || text.includes(" #")) return false;
  if (context === "flow" && FLOW_INDICATORS.test(text)) return false;
  return !NON_STRING_LITERALS.some((literal) => literal.test(text));
}

/**
 * Whether `style` can represent the string `text` at a scalar of `context`, so that an edited
 * token keeps it. A quoted style represents one line only: the YAML writer folds a line break of
 * a quoted scalar into blank lines, which an author would not recognize as the typed paragraphs.
 */
export function canRepresent(style: ScalarStyle, text: string, context: ScalarContext): boolean {
  switch (style) {
    case "plain":
      return isPlainSafe(text, context);
    case "single-quoted":
      return !/[\n\r]/.test(text) && !CONTROL.test(text);
    case "double-quoted":
      return !/[\n\r]/.test(text);
    case "literal":
    case "folded":
      return isBlockSafe(text, context);
  }
}

/**
 * Whether a block scalar can hold `text`. The YAML library writes a quoted scalar instead when
 * the text holds only whitespace, or ends with spaces after its last line break, so such texts
 * are excluded to keep the selected style.
 */
function isBlockSafe(text: string, context: ScalarContext): boolean {
  if (context === "flow" || context === "key") return false;
  if (text.trim() === "" || /\n[\t ]+$/.test(text)) return false;
  return !CONTROL.test(text) && !text.includes("\r");
}

/**
 * Style of a committed value. A number or a boolean is written plain. A string keeps the style
 * `current` of the edited token when that style can represent it; otherwise, and for a value
 * written for the first time, the style follows the content of the string.
 */
export function selectScalarStyle(
  value: WrittenValue,
  context: ScalarContext,
  current: ScalarStyle | null,
): ScalarStyle {
  if (typeof value !== "string") return "plain";
  if (current !== null && canRepresent(current, value, context)) return current;
  if (/[\n\r]/.test(value)) return isBlockSafe(value, context) ? "literal" : "double-quoted";
  if (CONTROL.test(value)) return "double-quoted";
  if (value.includes("\\")) return "single-quoted";
  return isPlainSafe(value, context) ? "plain" : "single-quoted";
}

/** Text of a committed value, as the YAML writer receives it. */
export function textOfValue(value: WrittenValue): string {
  return typeof value === "string" ? value : String(value);
}
