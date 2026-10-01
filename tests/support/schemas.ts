/**
 * Construction of schema sets from literal schemas, for unit tests of the domain.
 */
import { SchemaSet, SchemaView, type JsonValue } from "../../src/domain";

/** Schema set whose root is the first entry of `documents`, keyed by vault path. */
export function schemaSet(documents: Readonly<Record<string, JsonValue>>): SchemaSet {
  const entries = Object.entries(documents);
  const [root] = entries;
  if (root === undefined) throw new Error("At least one document is required.");
  return new SchemaSet(
    root[0],
    entries.map(([path, value]) => ({ path, root: value })),
  );
}

/** View of a single schema document, at the root. */
export function view(schema: JsonValue): SchemaView {
  return SchemaView.root(schemaSet({ "root.schema.json": schema }));
}
