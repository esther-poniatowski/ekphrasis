/**
 * Unfilled values: the null value, an absent key, and the values that a schema declares by the
 * keyword `x-unfilled`, as the feature note on schemas specifies.
 */
import { isJsonObject, type JsonValue } from "../schema/json";

/** Whether two JSON values are equal: same scalars, same items in order, same entries. */
export function jsonEquals(a: JsonValue | undefined, b: JsonValue | undefined): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    const left = a as readonly JsonValue[];
    const right = b as readonly JsonValue[];
    return (
      left.length === right.length && left.every((item, index) => jsonEquals(item, right[index]))
    );
  }
  if (isJsonObject(a) && isJsonObject(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every(
        (key) => Object.prototype.hasOwnProperty.call(b, key) && jsonEquals(a[key], b[key]),
      )
    );
  }
  return false;
}

export class UnfilledValues {
  /** @param declared Values of the keyword `x-unfilled`, counted besides the null value. */
  constructor(private readonly declared: readonly JsonValue[]) {}

  /** Whether `value` is unfilled; `undefined` stands for an absent key. */
  has(value: JsonValue | undefined): boolean {
    if (value === undefined || value === null) return true;
    return this.declared.some((unfilled) => jsonEquals(unfilled, value));
  }
}
