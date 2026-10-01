/**
 * References between schemas: the keyword `$ref`, its target document and its fragment.
 *
 * A schema document is identified by its vault path, and a relative reference is resolved from
 * the folder of the referencing document, as the feature note on schemas specifies. A reference
 * by absolute URI is matched against the `$id` of the loaded documents instead.
 */
import { folderOf, isUri, resolveVaultPath } from "../files/vault-paths";
import { isJsonObject, type JsonObject, type JsonValue } from "./json";

/** Target of a `$ref`: a document, and a JSON Pointer (`/…`) or an anchor name inside it. */
export interface ReferenceTarget {
  /** Vault path of the document, or the absolute URI as written; `null` for the same document. */
  readonly document: string | null;
  readonly fragment: string;
}

/** Splits `reference`, written in the document at `from`, into its document and its fragment. */
export function parseReference(reference: string, from: string): ReferenceTarget | null {
  const hash = reference.indexOf("#");
  const location = hash < 0 ? reference : reference.slice(0, hash);
  const fragment = hash < 0 ? "" : decodeFragment(reference.slice(hash + 1));
  if (location === "") return { document: null, fragment };
  if (isUri(location)) return { document: location, fragment };
  const document = resolveVaultPath(folderOf(from), location);
  return document === null ? null : { document, fragment };
}

/** Evaluates a JSON Pointer (RFC 6901) against `root`; `undefined` when it designates nothing. */
export function evaluatePointer(root: JsonValue, pointer: string): JsonValue | undefined {
  if (pointer === "") return root;
  if (!pointer.startsWith("/")) return undefined;
  let current: JsonValue | undefined = root;
  for (const token of pointer.slice(1).split("/")) {
    const key = token.replace(/~1/g, "/").replace(/~0/g, "~");
    if (Array.isArray(current)) {
      current = /^\d+$/.test(key) ? (current as readonly JsonValue[])[Number(key)] : undefined;
    } else if (isJsonObject(current)) {
      current = Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined;
    } else {
      return undefined;
    }
  }
  return current;
}

/** Finds the subschema declaring `$anchor: name` inside `root`. */
export function findAnchor(root: JsonValue, name: string): JsonValue | undefined {
  let found: JsonValue | undefined;
  visitObjects(root, (object) => {
    if (found === undefined && object["$anchor"] === name) found = object;
  });
  return found;
}

/** Every `$ref` written in `root`, in document order. */
export function collectReferences(root: JsonValue): string[] {
  const references: string[] = [];
  visitObjects(root, (object) => {
    const reference = object["$ref"];
    if (typeof reference === "string") references.push(reference);
  });
  return references;
}

/** Calls `visit` on every object nested in `value`, `value` included, in document order. */
export function visitObjects(value: JsonValue, visit: (object: JsonObject) => void): void {
  if (Array.isArray(value)) {
    for (const item of value as readonly JsonValue[]) visitObjects(item, visit);
  } else if (isJsonObject(value)) {
    visit(value);
    for (const child of Object.values(value)) visitObjects(child, visit);
  }
}

function decodeFragment(fragment: string): string {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}
