/**
 * Form of a new value decided by its siblings, as the feature note on saving specifies: the form
 * of a new collection written under a key of a block mapping, and the quoting style of a new
 * string.
 *
 * The siblings of the key `key` of a mapping are the other children of the parent of that
 * mapping, the other items of a sequence or the values of the other entries of a mapping, that
 * are mappings holding `key`. The siblings of an item of a sequence are the other items of that
 * sequence.
 *
 * - A new collection at `key` takes the flow form when every sibling writes `key` as a flow
 *   collection, and keeps the block form otherwise, and when it has no sibling. A sibling holding
 *   a scalar at `key`, such as an unfilled value, writes no flow collection there.
 * - A new string takes the quoted style shared by its siblings, when every sibling holding a
 *   filled value is a scalar written in that one quoted style. A sibling holding the null value or
 *   an unfilled value is not counted, since it holds no text written by the author.
 *
 * The decision marks the new collection with `flow`, and the new scalar with its quoted style;
 * the writer of new values writes a marked collection between brackets or braces, and keeps a
 * quoted style when it represents the value. A new value receives the decision at each of its
 * collections and scalars; the siblings of a value nested in a new value are found in the tree
 * above it, whether present or new.
 */
import type { MappingNode, ScalarNode, ScalarStyle, YamlNode } from "../model";
import type { UnfilledValues } from "../validation/unfilled";
import { isQuotedStyle } from "./scalar-style";

export class SiblingForms {
  constructor(private readonly unfilled: UnfilledValues) {}

  /**
   * `value`, the new value of the key `key` of the mapping `holder`, with the form of its
   * siblings at each new collection and scalar. `parent` holds `holder`, and is `null` when
   * `holder` is the root.
   */
  entry(key: string, value: YamlNode, holder: YamlNode | null, parent: YamlNode | null): YamlNode {
    switch (value.kind) {
      case "scalar":
        return this.styled(value, this.valuesAt(key, holder, parent));
      case "mapping":
      case "sequence":
        if (writesFlow(this.valuesAt(key, holder, parent))) return { ...value, flow: true };
        return this.child(value, holder);
      default:
        return value;
    }
  }

  /** `value`, a new child of `parent`, with the form of its siblings at each value it holds. */
  child(value: YamlNode, parent: YamlNode | null): YamlNode {
    switch (value.kind) {
      case "scalar":
        return parent?.kind === "sequence"
          ? this.styled(
              value,
              parent.items.filter((item) => item !== value),
            )
          : value;
      case "mapping":
        return {
          ...value,
          entries: value.entries.map((entry) => ({
            ...entry,
            value: this.entry(entry.key, entry.value, value, parent),
          })),
        };
      case "sequence":
        return { ...value, items: value.items.map((item) => this.child(item, value)) };
      default:
        return value;
    }
  }

  /**
   * Quoted style shared by the siblings of the value of the key `key` of `holder`, which a string
   * written there for the first time takes, or `null` when the siblings share none.
   */
  styleAt(key: string, holder: YamlNode | null, parent: YamlNode | null): ScalarStyle | null {
    return this.sharedQuotedStyle(this.valuesAt(key, holder, parent));
  }

  /** Values of `key` in the siblings of `holder` in `parent`. */
  private valuesAt(key: string, holder: YamlNode | null, parent: YamlNode | null): YamlNode[] {
    return siblingsOf(holder, parent).flatMap((sibling) =>
      sibling.entries.filter((entry) => entry.key === key).map((entry) => entry.value),
    );
  }

  /** `scalar` marked with the quoted style shared by `siblings`, when they share one. */
  private styled(scalar: ScalarNode, siblings: readonly YamlNode[]): YamlNode {
    const style = this.sharedQuotedStyle(siblings);
    return style === null ? scalar : { ...scalar, style };
  }

  private sharedQuotedStyle(siblings: readonly YamlNode[]): ScalarStyle | null {
    const counted = siblings
      .map(resolved)
      .filter(
        (node) =>
          node === null ||
          (node.range !== null && !(node.kind === "scalar" && this.unfilled.has(node.value))),
      );
    const [first] = counted;
    if (first?.kind !== "scalar" || !isQuotedStyle(first.style)) return null;
    const style = first.style;
    return counted.every((node) => node?.kind === "scalar" && node.style === style) ? style : null;
  }
}

/** Whether every value of `values`, of which there is at least one, is a flow collection. */
function writesFlow(values: readonly YamlNode[]): boolean {
  return (
    values.length > 0 &&
    values
      .map(resolved)
      .every((node) => (node?.kind === "mapping" || node?.kind === "sequence") && node.flow)
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
