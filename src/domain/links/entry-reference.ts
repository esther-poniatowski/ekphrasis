/**
 * References to the entries of other records: a field whose value names one entry of a
 * collection held by the records of another type, declared by the keyword `x-reference`.
 *
 * The keyword names three parts. The key `schema` names the logical contract of the records that
 * hold the entries, as their binding key declares it. The key `collection` names the field of
 * those records that holds the entries, by a field path from their root. The optional key `key`
 * names the identifier of an entry, by a field path from the entry. Without `key`, the entries of
 * a mapping are named by their keys, and the items of a sequence by their own text:
 *
 * ```yaml
 * x-reference: { schema: 'example:catalog@1', collection: streams }
 * x-reference: { schema: 'example:team@1', collection: members, key: id }
 * ```
 */
import { parseSchemaIdentifier } from "../binding/schema-field";
import type { SchemaIssue } from "../form/model";
import type { YamlPath } from "../model";
import {
  ANY_ITEM,
  ANY_KEY,
  FieldPathError,
  parseFieldPath,
  printFieldPath,
  printPatternPath,
} from "../paths/field-path";
import { walkFieldSchemas } from "../schema/field-walk";
import { DEFAULT_BINDING_KEY } from "../schema/binding-key";
import { isJsonObject, type JsonValue } from "../schema/json";
import type { SchemaView } from "../schema/schema-view";

/** Entries that a field of kind `reference` may name. */
export interface EntryReference {
  /** Logical contract of the records holding the entries, such as `example:catalog@1`. */
  readonly schema: string;
  /** Field path of the collection of entries, from the root of each record. */
  readonly collection: YamlPath;
  /**
   * Field path of the identifier of an entry, from the entry; `null` when the entries are named
   * by the keys of a mapping, or by the text of the items of a sequence.
   */
  readonly key: YamlPath | null;
}

/** Identifiers of the entries found in the vault for one reference. */
export interface ReferenceEntries {
  /** Number of records bound to the contract of the reference. */
  readonly records: number;
  /** Distinct identifiers of the entries of those records, in the order of their first record. */
  readonly identifiers: readonly string[];
}

/** Outcome of reading the keyword `x-reference` of a field schema. */
export type ReferenceDeclaration =
  | { readonly status: "absent" }
  | { readonly status: "declared"; readonly reference: EntryReference }
  /** The keyword is written, but malformed; the message states why. */
  | { readonly status: "defective"; readonly message: string };

const KEYS = new Set(["schema", "collection", "key"]);

/** Reads the keyword `x-reference` of the field schema `schema`. */
export function referenceDeclaration(schema: SchemaView): ReferenceDeclaration {
  const written = schema.declaredReference;
  if (written === null) return { status: "absent" };
  const defect = (reason: string): ReferenceDeclaration => ({
    status: "defective",
    message: `The keyword \`x-reference\` ${reason}.`,
  });
  if (!isJsonObject(written)) {
    return defect(
      "must hold a mapping with the keys `schema`, `collection` and, optionally, `key`",
    );
  }
  const unknown = Object.keys(written).filter((name) => !KEYS.has(name));
  if (unknown.length > 0) {
    return defect(`holds the unknown keys ${unknown.map((name) => `\`${name}\``).join(", ")}`);
  }
  const contract = written["schema"];
  if (typeof contract !== "string" || parseSchemaIdentifier(contract) === null) {
    return defect(
      "must name under `schema` the logical contract of the records, written `<owner>:<type>@<major>`",
    );
  }
  const collection = pathOf(written["collection"], "collection");
  if (typeof collection === "string") return defect(collection);
  if (collection.length === 0) {
    return defect("must name under `collection` a field of the records, not their root");
  }
  const key = written["key"] === undefined ? null : pathOf(written["key"], "key");
  if (typeof key === "string") return defect(key);
  return { status: "declared", reference: { schema: contract, collection, key } };
}

/**
 * Field path written under `name`, or the reason why it is none: a reference names one
 * collection and one identifier per entry, so a path holding a wildcard is refused.
 */
function pathOf(written: JsonValue | undefined, name: string): YamlPath | string {
  if (typeof written !== "string") return `must hold under \`${name}\` a field path`;
  try {
    const segments = parseFieldPath(written);
    if (segments.some((segment) => segment === ANY_ITEM || segment === ANY_KEY)) {
      return `holds under \`${name}\` the wildcard path \`${written}\`, whereas it names one field`;
    }
    return segments as YamlPath;
  } catch (error) {
    if (error instanceof FieldPathError) {
      return `holds under \`${name}\` \`${written}\`, which is no field path: ${error.message}`;
    }
    throw error;
  }
}

/** Reference declared by `schema`, or `null` when it declares none or a malformed one. */
export function referenceOf(schema: SchemaView): EntryReference | null {
  const declaration = referenceDeclaration(schema);
  return declaration.status === "declared" ? declaration.reference : null;
}

/** Defects of the keywords `x-reference` under the schema `root`, one per field schema. */
export function referenceDefects(
  root: SchemaView,
  bindingKey: string = DEFAULT_BINDING_KEY,
): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  walkFieldSchemas(
    root,
    (schema, path) => {
      const declaration = referenceDeclaration(schema);
      if (declaration.status === "defective") {
        issues.push({ path: printPatternPath(path), message: declaration.message });
      }
    },
    bindingKey,
  );
  return issues;
}

/**
 * Identifiers of the entries that the record `instance` holds for `reference`: the keys of the
 * mapping at the collection, or the text of the items of a sequence, without `key`; the text at
 * `key` in each entry otherwise. A value other than a non-empty string names no entry.
 */
export function entryIdentifiers(instance: JsonValue, reference: EntryReference): string[] {
  const collection = valueAt(instance, reference.collection);
  const entries: readonly [string | null, JsonValue][] = Array.isArray(collection)
    ? collection.map((item) => [null, item])
    : isJsonObject(collection)
      ? Object.entries(collection)
      : [];
  return entries.flatMap(([entryKey, entry]) => {
    const identifier =
      reference.key === null ? (entryKey ?? entry) : (valueAt(entry, reference.key) ?? null);
    return typeof identifier === "string" && identifier !== "" ? [identifier] : [];
  });
}

/**
 * Issue message of the value `value`, which names none of the entries `entries` found for
 * `reference`, or `null` when it names one of them.
 */
export function unknownEntryMessage(
  value: string,
  reference: EntryReference,
  entries: ReferenceEntries,
): string | null {
  if (entries.identifiers.includes(value)) return null;
  const contract = `\`${reference.schema}\``;
  if (entries.records === 0) {
    return `No record bound to ${contract} is found in the vault, so \`${value}\` names no entry.`;
  }
  const collection = `\`${printFieldPath(reference.collection)}\``;
  const by = reference.key === null ? "" : `, identified by \`${printFieldPath(reference.key)}\``;
  return `\`${value}\` names no entry of ${collection}${by}, in the records bound to ${contract}.`;
}

/** Value of `value` at `path`, or `undefined` when a segment designates nothing. */
function valueAt(value: JsonValue | undefined, path: YamlPath): JsonValue | undefined {
  let current = value;
  for (const segment of path) {
    if (typeof segment === "number") {
      current = Array.isArray(current) ? (current as readonly JsonValue[])[segment] : undefined;
    } else {
      current =
        isJsonObject(current) && Object.prototype.hasOwnProperty.call(current, segment)
          ? current[segment]
          : undefined;
    }
  }
  return current;
}
