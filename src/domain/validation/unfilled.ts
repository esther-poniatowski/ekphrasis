/**
 * Unfilled values: the null value, an absent key, and the values that a schema declares by the
 * keyword `x-unfilled`, as the feature note on schemas specifies.
 */
import { jsonEquals, type JsonValue } from "../schema/json";

export class UnfilledValues {
  /** @param declared Values of the keyword `x-unfilled`, counted besides the null value. */
  constructor(private readonly declared: readonly JsonValue[]) {}

  /** Whether `value` is unfilled; `undefined` stands for an absent key. */
  has(value: JsonValue | undefined): boolean {
    if (value === undefined || value === null) return true;
    return this.declared.some((unfilled) => jsonEquals(unfilled, value));
  }
}
