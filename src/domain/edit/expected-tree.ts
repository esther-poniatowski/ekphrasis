/**
 * Confirmation of a commit: the tree that the new text must parse to, and the comparison of two
 * trees by content.
 *
 * The comparison covers the whole document, so a commit is confirmed only when the edited value
 * reads back as committed and every other value reads back unchanged.
 */
import type { MappingEntry, ScalarValue, YamlNode, YamlPath } from "../model";

/**
 * Effect of a commit on the value at its path: a scalar set, a key or an item removed, or, at the
 * path of a sequence, an item inserted or moved. A removal marked `emptyAsNull` leaves the null
 * value in place of a mapping that it empties.
 */
export type CommitEffect =
  | { readonly kind: "set"; readonly value: ScalarValue }
  | { readonly kind: "remove"; readonly emptyAsNull?: boolean }
  | { readonly kind: "insert-item"; readonly index: number; readonly value: YamlNode }
  | { readonly kind: "move-item"; readonly from: number; readonly to: number };

const scalar = (value: ScalarValue): YamlNode => ({
  kind: "scalar",
  value,
  style: "plain",
  range: null,
});

/**
 * Tree of `tree` after `effect` at `path`. A missing key along the path is added, a position
 * after the last item appends an item, and a scalar along the path becomes a mapping or a
 * sequence, as an insertion under an empty value writes it.
 */
export function expectedTree(tree: YamlNode, path: YamlPath, effect: CommitEffect): YamlNode {
  const [segment, ...rest] = path;
  if (segment === undefined) return atTarget(tree, effect);
  if (typeof segment === "number") {
    const items = tree.kind === "sequence" ? tree.items : [];
    const flow = tree.kind === "sequence" && tree.flow;
    if (effect.kind === "remove" && rest.length === 0) {
      return { kind: "sequence", flow, range: null, items: items.filter((_, i) => i !== segment) };
    }
    const updated =
      segment === items.length
        ? [...items, expectedTree(scalar(null), rest, effect)]
        : items.map((item, index) => (index === segment ? expectedTree(item, rest, effect) : item));
    return { kind: "sequence", flow, range: null, items: updated };
  }
  const entries: readonly MappingEntry[] = tree.kind === "mapping" ? tree.entries : [];
  const existing = entries.find((entry) => entry.key === segment);
  if (effect.kind === "remove" && rest.length === 0) {
    const remaining = entries.filter((e) => e !== existing);
    if (remaining.length === 0 && effect.emptyAsNull === true) return scalar(null);
    return { kind: "mapping", flow: false, range: null, entries: remaining };
  }
  const value = expectedTree(existing?.value ?? scalar(null), rest, effect);
  const updated = existing
    ? entries.map((entry) => (entry === existing ? { ...entry, value } : entry))
    : [...entries, { key: segment, keyRange: null, value }];
  return {
    kind: "mapping",
    flow: tree.kind === "mapping" && tree.flow,
    range: null,
    entries: updated,
  };
}

/** Node at the path of a commit after its effect. */
function atTarget(tree: YamlNode, effect: CommitEffect): YamlNode {
  switch (effect.kind) {
    case "set":
      return scalar(effect.value);
    case "remove":
      return scalar(null);
    case "insert-item": {
      const items = tree.kind === "sequence" ? [...tree.items] : [];
      items.splice(effect.index, 0, effect.value);
      return { kind: "sequence", flow: tree.kind === "sequence" && tree.flow, range: null, items };
    }
    case "move-item": {
      if (tree.kind !== "sequence") return tree;
      const items = [...tree.items];
      const [moved] = items.splice(effect.from, 1);
      if (moved !== undefined) items.splice(effect.to, 0, moved);
      return { ...tree, range: null, items };
    }
  }
}

/**
 * Whether `a` and `b` hold the same content: equal scalar values, mappings with the same keys
 * holding the same content in any order, sequences with the same items in the same order, and
 * aliases to the same anchor name. Styles and ranges are ignored.
 */
export function sameContent(a: YamlNode, b: YamlNode): boolean {
  switch (a.kind) {
    case "scalar":
      return b.kind === "scalar" && Object.is(normalize(a.value), normalize(b.value));
    case "alias":
      return b.kind === "alias" && a.name === b.name;
    case "sequence":
      return (
        b.kind === "sequence" &&
        a.items.length === b.items.length &&
        a.items.every((item, index) => {
          const other = b.items[index];
          return other !== undefined && sameContent(item, other);
        })
      );
    case "mapping": {
      if (b.kind !== "mapping" || a.entries.length !== b.entries.length) return false;
      const byKey = new Map(b.entries.map((entry) => [entry.key, entry.value]));
      return a.entries.every((entry) => {
        const other = byKey.get(entry.key);
        return other !== undefined && sameContent(entry.value, other);
      });
    }
  }
}

/** Value compared by `Object.is`, under which `0` and `-0` would otherwise differ. */
function normalize(value: ScalarValue): ScalarValue {
  return value === 0 ? 0 : value;
}
