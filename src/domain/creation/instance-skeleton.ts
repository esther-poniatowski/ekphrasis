/** Constructs the initial value of a record from its schema. */
import { isJsonScalar, type JsonObject, type JsonValue } from "../schema/json";
import type { SchemaView } from "../schema/schema-view";

/**
 * Builds a minimal record in schema property order. Defaults are data chosen by the schema and
 * are therefore retained. Every other optional field stays absent. A required field takes its
 * constant, then the first scalar value declared by root `x-unfilled`, then `null`.
 */
export function instanceSkeleton(schema: SchemaView, identifier: string): JsonObject {
  const unfilled = schema.unfilledValues.find(isJsonScalar) ?? null;
  const entries: [string, JsonValue][] = [];
  for (const { key, schema: property } of schema.properties()) {
    if (key === "_schema") {
      entries.push([key, identifier]);
      continue;
    }
    if (property.defaultValue !== null) {
      entries.push([key, property.defaultValue.value]);
      continue;
    }
    if (!schema.required.has(key)) continue;
    entries.push([key, property.constValue?.value ?? unfilled]);
  }
  return Object.fromEntries(entries);
}
