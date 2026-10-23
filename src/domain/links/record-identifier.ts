/**
 * Identifiers of records: the field that holds the identifier of each record of a type, declared
 * at the root of its schema by the keyword `x-identifier` (e.g. `x-identifier: identity.id`), and
 * the value of that field in an instance.
 *
 * The keyword must designate a property declared by the schema, reached from the root through
 * the keyword `properties` of each group or of its alternatives, so that every record of the type
 * can hold its identifier at the same path.
 */
import type { SchemaIssue } from "../form/model";
import type { YamlPath } from "../model";
import {
  ANY_ITEM,
  ANY_KEY,
  FieldPathError,
  parseFieldPath,
  type PatternSegment,
} from "../paths/field-path";
import { displayedProperties } from "../schema/field-walk";
import { isJsonObject, type JsonValue } from "../schema/json";
import type { SchemaView } from "../schema/schema-view";

/** Outcome of reading the keyword `x-identifier` at the root of a schema. */
export type IdentifierDeclaration =
  | { readonly status: "absent" }
  | { readonly status: "declared"; readonly path: YamlPath }
  /** The keyword is written, but designates no declared field; the message states why. */
  | { readonly status: "defective"; readonly message: string };

/** Reads the keyword `x-identifier` of the schema `root`. */
export function identifierDeclaration(root: SchemaView): IdentifierDeclaration {
  const written = root.declaredIdentifier;
  if (written === null) return { status: "absent" };
  const defect = (reason: string): IdentifierDeclaration => ({
    status: "defective",
    message: `The keyword \`x-identifier\` ${reason}.`,
  });
  if (typeof written !== "string") {
    return defect("must hold the field path of the identifier, written as a string");
  }
  let segments: PatternSegment[];
  try {
    segments = parseFieldPath(written);
  } catch (error) {
    if (error instanceof FieldPathError) {
      return defect(`holds \`${written}\`, which is no field path: ${error.message}`);
    }
    throw error;
  }
  if (segments.some((segment) => segment === ANY_ITEM || segment === ANY_KEY)) {
    return defect(`holds the wildcard path \`${written}\`, whereas the identifier is one field`);
  }
  const path = segments as YamlPath;
  if (path.length === 0 || !declaresField(root, path)) {
    return defect(
      `names the field \`${written}\`, which the properties of the schema do not declare`,
    );
  }
  return { status: "declared", path };
}

/** Defect of the keyword `x-identifier` of the schema `root`, located at the root, if any. */
export function identifierDefects(root: SchemaView): SchemaIssue[] {
  const declaration = identifierDeclaration(root);
  return declaration.status === "defective" ? [{ path: "", message: declaration.message }] : [];
}

/**
 * Identifier held by the JSON value `instance` at `path`: a non-empty string, else `null`, so a
 * record whose identifier is absent, empty or not a string declares none.
 */
export function readIdentifier(instance: JsonValue, path: YamlPath): string | null {
  let value: JsonValue | undefined = instance;
  for (const segment of path) {
    if (typeof segment !== "string" || !isJsonObject(value)) return null;
    value = Object.prototype.hasOwnProperty.call(value, segment) ? value[segment] : undefined;
  }
  return typeof value === "string" && value !== "" ? value : null;
}

/** Whether the keys of `path` descend from `root` through declared properties. */
function declaresField(root: SchemaView, path: YamlPath): boolean {
  let schema: SchemaView = root;
  for (const segment of path) {
    if (typeof segment !== "string") return false;
    const property = displayedProperties(schema).find(({ key }) => key === segment);
    if (property === undefined) return false;
    schema = property.schema;
  }
  return true;
}
