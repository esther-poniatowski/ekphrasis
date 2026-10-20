/**
 * Form of a new collection written under a key of a block mapping, decided by its siblings, as
 * the feature note on saving specifies.
 *
 * The siblings of the key `key` of a mapping are the other children of the parent of that
 * mapping, the other items of a sequence or the values of the other entries of a mapping, that
 * are mappings holding `key`. A new collection at `key` takes the flow form when every sibling
 * writes `key` as a flow collection, and keeps the block form otherwise, and when it has no
 * sibling. A sibling holding a scalar at `key`, such as an unfilled value, writes no flow
 * collection there.
 *
 * The decision marks the new collection with `flow`, and the writer of new values writes a
 * marked collection between brackets or braces. A new value receives the decision at each of its
 * collections; the siblings of a collection nested in a new value are found in the tree above it,
 * whether present or new.
 */
import type { MappingNode, YamlNode } from "../model";

/**
 * `value`, the new value of the key `key` of the mapping `holder`, with the form of its siblings
 * at each new collection. `parent` holds `holder`, and is `null` when `holder` is the root.
 */
export function entryWithSiblingForms(
  key: string,
  value: YamlNode,
  holder: YamlNode | null,
  parent: YamlNode | null,
): YamlNode {
  if ((value.kind === "mapping" || value.kind === "sequence") && writesFlow(key, holder, parent)) {
    return { ...value, flow: true };
  }
  return childWithSiblingForms(value, holder);
}

/** `value`, a new child of `parent`, with the form of their siblings at the collections it holds. */
export function childWithSiblingForms(value: YamlNode, parent: YamlNode | null): YamlNode {
  switch (value.kind) {
    case "mapping":
      return {
        ...value,
        entries: value.entries.map((entry) => ({
          ...entry,
          value: entryWithSiblingForms(entry.key, entry.value, value, parent),
        })),
      };
    case "sequence":
      return { ...value, items: value.items.map((item) => childWithSiblingForms(item, value)) };
    default:
      return value;
  }
}

/** Whether every sibling of `holder` in `parent` holding `key` writes it as a flow collection. */
function writesFlow(key: string, holder: YamlNode | null, parent: YamlNode | null): boolean {
  const values = siblingsOf(holder, parent).flatMap((sibling) =>
    sibling.entries.filter((entry) => entry.key === key).map((entry) => resolved(entry.value)),
  );
  return (
    values.length > 0 &&
    values.every(
      (node) => (node?.kind === "mapping" || node?.kind === "sequence") && node.flow === true,
    )
  );
}

/** Mappings among the children of `parent` other than `holder`. */
function siblingsOf(holder: YamlNode | null, parent: YamlNode | null): MappingNode[] {
  if (parent === null || holder === null) return [];
  const children =
    parent.kind === "sequence"
      ? parent.items
      : parent.kind === "mapping"
        ? parent.entries.map((entry) => entry.value)
        : [];
  return children
    .map(resolved)
    .filter((child): child is MappingNode => child?.kind === "mapping" && child !== holder);
}

/** Node that `node` designates: the target of an alias, or the node itself. */
function resolved(node: YamlNode): YamlNode | null {
  return node.kind === "alias" ? node.target : node;
}
