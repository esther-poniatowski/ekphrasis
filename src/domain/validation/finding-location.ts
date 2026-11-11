/**
 * Location of a finding reported by an external tool in a findings log, as a field path of the
 * form. The locus of such a finding is a JSON Pointer (RFC 6901). For an entry of a list keyed by
 * an identifier, a producer may stop the pointer at the list and open its discriminator with the
 * identifier of the entry, followed by the segments below the entry and by the offending content,
 * each part escaped as a pointer token and the parts joined by `/`. The discriminator then
 * carries the rest of the location.
 *
 * The location reads only the instance and the form model: an entry is the one item of the list
 * holding the identifier as the value of one of its keys, and each later part descends while it
 * names a declared field or a node of the instance. The first part that does neither is offending
 * content, so the location stops there. A path designating no field leaves the issue at the top of
 * the form; nothing is moved to a neighbouring field.
 */
import type { YamlPath } from "../model";
import { isJsonObject, type JsonValue } from "../schema/json";
import type { Field } from "../form/model";
import { fieldChain } from "../form/navigation";
import { pathOfPointer } from "./validator-errors";

/** Whether `locus` is a JSON Pointer: empty for the whole instance, or opening on `/`. */
export function isJsonPointer(locus: string): boolean {
  return (locus === "" || locus.startsWith("/")) && !/~(?![01])/.test(locus);
}

/**
 * Field path of the finding at the JSON Pointer `pointer`, refined by `discriminator`, in the
 * instance `instance` whose form model has the root field `root`.
 */
export function locateFinding(
  root: Field,
  instance: JsonValue,
  pointer: string,
  discriminator = "",
): YamlPath {
  const path = pathOfPointer(pointer, instance);
  if (discriminator === "") return path;
  const list = valueAt(instance, path);
  if (!Array.isArray(list)) return path;
  const [identifier, ...below] = discriminator.split("/").map(unescapeToken);
  const index = entryHolding(list as readonly JsonValue[], identifier ?? "");
  if (index === null) return path;
  let located: YamlPath = [...path, index];
  if (fieldChain(root, located) === null) return path;
  for (const part of below) {
    const next = childSegment(root, instance, located, part);
    if (next === null) break;
    located = [...located, next];
  }
  return located;
}

/** Index of the one mapping of `list` holding `identifier` as a value, or `null`. */
function entryHolding(list: readonly JsonValue[], identifier: string): number | null {
  const holders = list.flatMap((item, index) =>
    isJsonObject(item) && Object.values(item).some((value) => value === identifier) ? [index] : [],
  );
  return holders.length === 1 ? (holders[0] ?? null) : null;
}

/**
 * Segment naming `part` below `path`: a field that the schema declares there, or a key or an
 * index that the instance holds there; `null` when `part` is neither, hence offending content.
 */
function childSegment(
  root: Field,
  instance: JsonValue,
  path: YamlPath,
  part: string,
): string | number | null {
  const node = valueAt(instance, path);
  const segment: string | number = Array.isArray(node) && /^\d+$/.test(part) ? Number(part) : part;
  const held = valueAt(instance, [...path, segment]) !== undefined;
  const field = fieldChain(root, path)?.at(-1);
  const declared =
    field !== undefined &&
    "children" in field &&
    [...field.children, ...field.alternativeChildren.flat()].some(
      (child) => child.path.at(-1) === segment,
    );
  if (!held && !declared) return null;
  return fieldChain(root, [...path, segment]) === null ? null : segment;
}

/** Node of `instance` at `path`, or `undefined` when the instance holds none there. */
function valueAt(instance: JsonValue, path: YamlPath): JsonValue | undefined {
  let current: JsonValue | undefined = instance;
  for (const segment of path) {
    if (typeof segment === "number" && Array.isArray(current)) {
      current = (current as readonly JsonValue[])[segment];
    } else if (typeof segment === "string" && isJsonObject(current)) {
      current = current[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

/** Part of a discriminator with its pointer escapes decoded. */
function unescapeToken(token: string): string {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}
