/**
 * Navigation in the form model by field path.
 */
import type { YamlPath } from "../model";
import type { Field } from "./model";
import { placeField } from "./templates";

/**
 * Fields from the root to the field at `path`, both included, or `null` when the model holds no
 * field at `path`. Besides the displayed fields, a path reaches the fields of an alternative that
 * the value does not match, the next item of a sequence, and a new entry of a mapping keyed by
 * identifiers, so a commit can write into each of them.
 */
export function fieldChain(root: Field, path: YamlPath): Field[] | null {
  const chain: Field[] = [root];
  let current: Field = root;
  for (const segment of path) {
    const next = childAt(current, segment);
    if (next === undefined) return null;
    chain.push(next);
    current = next;
  }
  return chain;
}

function childAt(field: Field, segment: string | number): Field | undefined {
  if ("children" in field) {
    if (typeof segment !== "string") return undefined;
    const isAt = (child: Field): boolean => child.path.at(-1) === segment;
    const child = field.children.find(isAt) ?? field.alternativeChildren.flat().find(isAt);
    if (child !== undefined) return child;
    return field.entryTemplate === null
      ? undefined
      : placeField(field.entryTemplate, [...field.path, segment], [...field.identity, segment]);
  }
  if ("items" in field && typeof segment === "number") {
    if (segment === field.items.length) return field.next ?? undefined;
    return field.items[segment];
  }
  return undefined;
}
