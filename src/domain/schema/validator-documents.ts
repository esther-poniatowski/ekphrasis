/**
 * Schema documents prepared for a JSON Schema validator.
 *
 * Ekphrasis resolves a relative `$ref` from the folder of the referencing file, whereas a
 * validator resolves it from the `$id` of the enclosing schema, and a project may set that `$id`
 * to any URI. Therefore, each document is given to the validator under a URI derived from its
 * vault path, with every `$ref` rewritten to the absolute URI of the schema resolved by ekphrasis.
 * The validator then reaches the same schema as the form model for every reference.
 */
import { isJsonObject, type JsonValue } from "./json";
import { parseReference } from "./reference";
import type { SchemaSet } from "./schema-set";

/** Origin of the URIs of the documents, which designates no resource on the network. */
const VAULT_ORIGIN = "https://vault.ekphrasis.invalid/";

/** A schema document under the URI by which the validator registers it. */
export interface ValidatorDocument {
  readonly uri: string;
  readonly schema: JsonValue;
}

/** URI of the document at the vault path `path`. */
export function documentUri(path: string): string {
  return VAULT_ORIGIN + path.split("/").map(encodeURIComponent).join("/");
}

/**
 * Documents of `schemas`, root first, each with its root `$id` set to its URI, every nested
 * `$id` removed, and every `$ref` absolute. For the validator, a nested `$id` changes the base
 * URI of its subschema, whereas the resolution of ekphrasis ignores nested identifiers.
 */
export function validatorDocuments(schemas: SchemaSet): ValidatorDocument[] {
  return schemas.paths.map((path) => ({
    uri: documentUri(path),
    schema: rewrite(schemas.document(path) ?? true, path, schemas, true),
  }));
}

function rewrite(value: JsonValue, path: string, schemas: SchemaSet, root: boolean): JsonValue {
  if (Array.isArray(value)) {
    return (value as readonly JsonValue[]).map((item) => rewrite(item, path, schemas, false));
  }
  if (!isJsonObject(value)) return value;
  const entries: [string, JsonValue][] = [];
  for (const [key, child] of Object.entries(value)) {
    if (key === "$id" && typeof child === "string") continue;
    if (key === "$ref" && typeof child === "string") {
      entries.push([key, absoluteReference(child, path, schemas)]);
    } else {
      entries.push([key, rewrite(child, path, schemas, false)]);
    }
  }
  if (root) entries.unshift(["$id", documentUri(path)]);
  return Object.fromEntries(entries);
}

/**
 * Absolute URI of the schema designated by `reference`, written in the document at `path`. A
 * reference that designates no loaded document keeps its text, so the validator reports it.
 */
function absoluteReference(reference: string, path: string, schemas: SchemaSet): string {
  const target = parseReference(reference, path);
  if (target === null) return reference;
  const document = target.document === null ? path : schemas.documentPath(target.document);
  if (document === null) return reference;
  const fragment = target.fragment.startsWith("/")
    ? target.fragment.split("/").map(encodeURIComponent).join("/")
    : encodeURIComponent(target.fragment);
  return `${documentUri(document)}#${fragment}`;
}
