/**
 * Conversion of the errors of a JSON Schema validator into issues located by field paths.
 *
 * A validator locates an error by the JSON Pointer of the node checked, so three conversions
 * apply, as the implementation plan records:
 *
 * - a pointer becomes a field path, whose segments take their type from the instance (a key
 *   written with digits stays a key in a mapping);
 * - an error on a key of a mapping (a missing required key, a key outside the schema, a key that
 *   a name schema rejects) points to the mapping, so the key is appended to its path;
 * - the errors of the alternatives of a `oneOf` or an `anyOf` merge into the error of the keyword
 *   itself, so each such keyword yields one issue.
 */
import type { YamlPath } from "../model";
import { isJsonObject, type JsonObject, type JsonValue } from "../schema/json";
import { issue, MISSING_MESSAGE, type Issue } from "./issues";

/** Error of a JSON Schema validator, in the form of Ajv without its library types. */
export interface ValidatorError {
  /** JSON Pointer of the node checked. */
  readonly pointer: string;
  readonly keyword: string;
  readonly params: JsonObject;
  /** Message of the validator, used when no message of ekphrasis covers the keyword. */
  readonly message: string;
  /** Key of the mapping at `pointer` whose name failed a check under `propertyNames`. */
  readonly propertyName: string | null;
}

/** Keywords whose failure is the failure of all of their alternatives. */
const ALTERNATIVE_KEYWORDS = new Set(["oneOf", "anyOf"]);

/** Keywords whose error designates a key of the mapping at the pointer, by a parameter. */
const KEY_PARAMETERS: Readonly<Record<string, string>> = {
  required: "missingProperty",
  dependentRequired: "missingProperty",
  additionalProperties: "additionalProperty",
  unevaluatedProperties: "unevaluatedProperty",
  propertyNames: "propertyName",
};

/**
 * Issues of the errors reported on `instance`, the value given to the validator, in the order
 * of the errors. The errors must keep the order of the validator, in which the errors of the
 * alternatives of a `oneOf` immediately precede the error of the `oneOf`.
 */
export function issuesFromValidatorErrors(
  errors: readonly ValidatorError[],
  instance: JsonValue,
): Issue[] {
  const kept: ValidatorError[] = [];
  const absorbed = new Map<ValidatorError, readonly ValidatorError[]>();
  for (const error of errors) {
    // The failure of `if` reports the failure of its `then` or `else`, whose errors stand apart.
    if (error.keyword === "if") continue;
    // A key rejected by `propertyNames` is reported once, by the error of that keyword.
    if (error.propertyName !== null && error.keyword !== "propertyNames") continue;
    if (ALTERNATIVE_KEYWORDS.has(error.keyword)) {
      const alternatives: ValidatorError[] = [];
      while (kept.length > 0 && isAtOrBelow(kept[kept.length - 1]!.pointer, error.pointer)) {
        alternatives.unshift(kept.pop()!);
      }
      absorbed.set(error, alternatives);
    }
    kept.push(error);
  }
  const issues: Issue[] = [];
  const seen = new Set<string>();
  for (const error of kept) {
    const converted = toIssue(error, absorbed.get(error) ?? [], instance);
    const key = `${converted.id}\u0000${converted.checker}\u0000${converted.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    issues.push(converted);
  }
  return issues;
}

/** Field path of the node designated by `pointer` in `instance`. */
export function pathOfPointer(pointer: string, instance: JsonValue): YamlPath {
  if (pointer === "") return [];
  const path: (string | number)[] = [];
  let current: JsonValue | undefined = instance;
  for (const token of pointer.slice(1).split("/")) {
    const key = token.replace(/~1/g, "/").replace(/~0/g, "~");
    if (Array.isArray(current) && /^\d+$/.test(key)) {
      path.push(Number(key));
      current = (current as readonly JsonValue[])[Number(key)];
    } else {
      path.push(key);
      current = isJsonObject(current) ? current[key] : undefined;
    }
  }
  return path;
}

function isAtOrBelow(pointer: string, ancestor: string): boolean {
  return pointer === ancestor || pointer.startsWith(`${ancestor}/`);
}

function toIssue(
  error: ValidatorError,
  alternatives: readonly ValidatorError[],
  instance: JsonValue,
): Issue {
  const path = pathOfPointer(error.pointer, instance);
  const parameter = KEY_PARAMETERS[error.keyword];
  const key = parameter === undefined ? undefined : error.params[parameter];
  const located = typeof key === "string" ? [...path, key] : path;
  const missing = error.keyword === "required" || error.keyword === "dependentRequired";
  return issue(located, error.keyword, messageOf(error, alternatives), { missing });
}

// --- Messages ------------------------------------------------------------------------------------

/** Text of a value, a string without its quotes. */
function plain(value: JsonValue | undefined): string {
  return typeof value === "string" ? value : JSON.stringify(value ?? null);
}

/** Value written as code, a string without its quotes. */
function code(value: JsonValue | undefined): string {
  return `\`${plain(value)}\``;
}

const COMPARISONS: Readonly<Record<string, string>> = {
  ">=": "at least",
  ">": "greater than",
  "<=": "at most",
  "<": "less than",
};

function messageOf(error: ValidatorError, alternatives: readonly ValidatorError[]): string {
  const { params } = error;
  const limit = params["limit"];
  switch (error.keyword) {
    case "required":
      return MISSING_MESSAGE;
    case "dependentRequired":
      return `This field is required when ${code(params["property"])} is present.`;
    case "additionalProperties":
    case "unevaluatedProperties":
      return "This key is outside the schema.";
    case "propertyNames":
      return "This key is not admitted by the schema of the keys.";
    case "type": {
      const types = plain(params["type"] ?? "").split(",");
      return `The value must be of type ${types.map((type) => code(type)).join(" or ")}.`;
    }
    case "enum":
      return admittedValues(asList(params["allowedValues"]));
    case "const":
      return `The value must be ${code(params["allowedValue"])}.`;
    case "oneOf":
    case "anyOf":
      return alternativesMessage(error, alternatives);
    case "pattern":
      return `The text must match the pattern ${code(params["pattern"])}.`;
    case "format":
      return `The text must be a valid ${code(params["format"])}.`;
    case "minLength":
      return `The text must hold at least ${plain(limit)} characters.`;
    case "maxLength":
      return `The text must hold at most ${plain(limit)} characters.`;
    case "minimum":
    case "maximum":
    case "exclusiveMinimum":
    case "exclusiveMaximum":
      return `The value must be ${COMPARISONS[plain(params["comparison"])] ?? plain(params["comparison"])} ${plain(limit)}.`;
    case "multipleOf":
      return `The value must be a multiple of ${plain(params["multipleOf"])}.`;
    case "minItems":
      return `The sequence must hold at least ${plain(limit)} items.`;
    case "maxItems":
      return `The sequence must hold at most ${plain(limit)} items.`;
    case "minProperties":
      return `The mapping must hold at least ${plain(limit)} keys.`;
    case "maxProperties":
      return `The mapping must hold at most ${plain(limit)} keys.`;
    case "uniqueItems": {
      const positions = [Number(params["i"]), Number(params["j"])].sort((a, b) => a - b);
      return `Items #${positions[0]! + 1} and #${positions[1]! + 1} are identical.`;
    }
    case "not":
      return "The value matches a schema that the field excludes.";
    default:
      return `The value fails the keyword ${code(error.keyword)} of the schema: ${error.message}.`;
  }
}

/**
 * Message of a failed `oneOf` or `anyOf`: the admitted values when every alternative fixes
 * values by `const` or `enum`, and else the failure of the alternatives as a whole.
 */
function alternativesMessage(
  error: ValidatorError,
  alternatives: readonly ValidatorError[],
): string {
  if (Array.isArray(error.params["passingSchemas"])) {
    return "The value matches several alternatives, whereas exactly one is admitted.";
  }
  const values = alternatives.flatMap((alternative): readonly (JsonValue | undefined)[] =>
    alternative.keyword === "const"
      ? [alternative.params["allowedValue"] ?? null]
      : alternative.keyword === "enum"
        ? asList(alternative.params["allowedValues"])
        : [undefined],
  );
  if (values.length > 0 && values.every((value) => value !== undefined)) {
    return admittedValues(values);
  }
  return "The value matches none of the admitted alternatives.";
}

function admittedValues(values: readonly JsonValue[]): string {
  return `The value must be one of: ${values.map((value) => code(value)).join(", ")}.`;
}

function asList(value: JsonValue | undefined): readonly JsonValue[] {
  return Array.isArray(value) ? (value as readonly JsonValue[]) : [];
}
