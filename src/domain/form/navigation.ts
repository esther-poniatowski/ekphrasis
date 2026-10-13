/**
 * Navigation in the form model by field path.
 */
import type { YamlPath } from "../model";
import type { Field } from "./model";

/**
 * Fields from the root to the field at `path`, both included, or `null` when the model holds no
 * field at `path`.
 */
export function fieldChain(root: Field, path: YamlPath): Field[] | null {
  const chain: Field[] = [root];
  let current: Field = root;
  for (const segment of path) {
    const next: Field | undefined =
      "children" in current
        ? current.children.find((child) => child.path.at(-1) === segment)
        : "items" in current && typeof segment === "number"
          ? current.items[segment]
          : undefined;
    if (next === undefined) return null;
    chain.push(next);
    current = next;
  }
  return chain;
}
