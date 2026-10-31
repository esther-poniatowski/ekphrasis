/**
 * JSON values, the data model of a schema once its JSON or YAML text is parsed.
 */

export type JsonScalar = string | number | boolean | null;
export type JsonValue = JsonScalar | readonly JsonValue[] | JsonObject;
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isJsonScalar(value: JsonValue | undefined): value is JsonScalar {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

/**
 * Checks that `value`, produced by a parser, is a JSON value, and returns it typed.
 *
 * @returns `null` when the value holds a non-JSON datum (a date, a function, a non-finite number).
 */
export function asJsonValue(value: unknown): JsonValue | null {
  return isJson(value) ? value : null;
}

function isJson(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJson);
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.values(value as Record<string, unknown>).every(isJson);
  }
  return false;
}

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
