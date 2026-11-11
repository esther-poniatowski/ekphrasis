/**
 * Reads the logical schema identifier declared by a YAML instance.
 *
 * Reading the top-level field from source allows Ekphrasis to locate the schema before parsing
 * the rest of a record, including when that record is broken.
 */
const SCHEMA_FIELD_KEY = /^_schema\s*:(.*)$/;
const SCHEMA_FIELD_VALUE = /^\s*(?:["']([^"']+)["']|([^#\s]+))\s*(?:#.*)?$/;
const SCHEMA_IDENTIFIER = /^([^:@\s]+):([^:@\s]+)@(\d+)$/;

/** Parts of a logical schema identifier. */
export interface SchemaIdentifier {
  readonly owner: string;
  readonly type: string;
  readonly major: string;
}

/** Presence and readable scalar value of the root `_schema` field. */
export type SchemaFieldDeclaration =
  | { readonly status: "absent" }
  | { readonly status: "declared"; readonly value: string | null; readonly raw: string };

/** Logical schema identifier declared by a top-level field, or `null` when none is declared. */
export function readSchemaField(text: string): string | null {
  const declaration = readSchemaDeclaration(text);
  return declaration.status === "declared" ? declaration.value : null;
}

/** Reads whether the root `_schema` key is absent or declares a readable scalar. */
export function readSchemaDeclaration(text: string): SchemaFieldDeclaration {
  for (const raw of text.split(/\r?\n/u)) {
    const field = SCHEMA_FIELD_KEY.exec(raw);
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
