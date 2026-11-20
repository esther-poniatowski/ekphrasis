/**
 * Reads the logical schema identifier declared by a YAML instance under its binding key.
 *
 * Reading the top-level field from source allows Ekphrasis to locate the schema before parsing
 * the rest of a record, including when that record is broken.
 */
import { DEFAULT_BINDING_KEY, isBindingKey } from "../schema/binding-key";

const SCHEMA_FIELD_VALUE = /^\s*(?:["']([^"']+)["']|([^#\s]+))\s*(?:#.*)?$/;
const SCHEMA_IDENTIFIER = /^([^:@\s]+):([^:@\s]+)@(\d+)$/;

/** Parts of a logical schema identifier. */
export interface SchemaIdentifier {
  readonly owner: string;
  readonly type: string;
  readonly major: string;
}

/** Presence and readable scalar value of the root field named by the binding key. */
export type SchemaFieldDeclaration =
  | { readonly status: "absent" }
  | { readonly status: "declared"; readonly value: string | null; readonly raw: string };

/** Logical schema identifier declared by a top-level field, or `null` when none is declared. */
export function readSchemaField(
  text: string,
  bindingKey: string = DEFAULT_BINDING_KEY,
): string | null {
  const declaration = readSchemaDeclaration(text, bindingKey);
  return declaration.status === "declared" ? declaration.value : null;
}

/**
 * Reads whether the root key `bindingKey` is absent or declares a readable scalar.
 *
 * @throws {RangeError} When `bindingKey` is not a property name that a binding key admits.
 */
export function readSchemaDeclaration(
  text: string,
  bindingKey: string = DEFAULT_BINDING_KEY,
): SchemaFieldDeclaration {
  if (!isBindingKey(bindingKey)) throw new RangeError(`invalid binding key ${bindingKey}`);
  const fieldKey = new RegExp(`^${bindingKey}\\s*:(.*)$`, "u");
  for (const raw of text.split(/\r?\n/u)) {
    const field = fieldKey.exec(raw);
    if (field === null) continue;
    const source = field[1] ?? "";
    const value = SCHEMA_FIELD_VALUE.exec(source);
    return {
      status: "declared",
      value: value === null ? null : (value[1] ?? value[2] ?? null),
      raw: source.trim(),
    };
  }
  return { status: "absent" };
}

/** Parts of `<owner>:<type>@<major>`, or `null` when `value` has another form. */
export function parseSchemaIdentifier(value: string): SchemaIdentifier | null {
  const match = SCHEMA_IDENTIFIER.exec(value);
  if (match === null) return null;
  return { owner: match[1]!, type: match[2]!, major: match[3]! };
}
