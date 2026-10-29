/**
 * Reads the logical schema identifier declared by a YAML instance.
 *
 * Reading the top-level field from source allows Ekphrasis to locate the schema before parsing
 * the rest of a record, including when that record is broken.
 */
const SCHEMA_FIELD = /^_schema\s*:\s*(?:["']([^"']+)["']|([^#\s]+))\s*(?:#.*)?$/;

/** Logical schema identifier declared by a top-level field, or `null` when none is declared. */
export function readSchemaField(text: string): string | null {
  for (const raw of text.split(/\r?\n/u)) {
    const match = SCHEMA_FIELD.exec(raw);
    if (match !== null) return match[1] ?? match[2] ?? null;
  }
  return null;
}
