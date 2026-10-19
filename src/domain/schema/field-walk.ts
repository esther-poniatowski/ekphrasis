/**
 * Walk over the schemas of the fields of a form, independent of any instance: the root, the
 * properties of each group and of its alternatives, the items of each sequence, and the entries
 * admitted by `patternProperties` or `additionalProperties`. The checks of a schema that no
 * instance affects visit each field schema through this walk, once.
 */
import { ANY_ITEM, ANY_KEY, type PatternSegment } from "../paths/field-path";
import type { PropertySchema, SchemaView } from "./schema-view";

/** Bound on the depth of the walk, so a recursive schema terminates. */
const MAX_DEPTH = 16;

/** Properties displayed for a group: its own, then those of the alternatives of its `oneOf`. */
export function displayedProperties(schema: SchemaView): PropertySchema[] {
  return [
    ...schema.properties(),
    ...schema.oneOf().flatMap((alternative) => alternative.properties()),
  ];
}

/**
 * Calls `visit` on each field schema under `root`, with the path of its field, wildcards
 * standing for items and entries. A subschema reached by several paths, such as a shared
 * definition or a recursive one, is visited at the first path only.
 */
export function walkFieldSchemas(
  root: SchemaView,
  visit: (schema: SchemaView, path: readonly PatternSegment[]) => void,
): void {
  const visited = new Set<object>();
  const walk = (schema: SchemaView, path: readonly PatternSegment[]): void => {
    const identity = schema.identity;
    if (identity === null || visited.has(identity) || path.length > MAX_DEPTH) return;
    visited.add(identity);
    visit(schema, path);
    for (const { key, schema: property } of displayedProperties(schema)) {
      walk(property, [...path, key]);
    }
    const items = schema.items();
    if (items !== null) walk(items, [...path, ANY_ITEM]);
    const entries = schema.dynamicSchema();
    if (entries !== null) walk(entries, [...path, ANY_KEY]);
  };
  walk(root, []);
}
