/**
 * Data of an instance as validation reads it: the JSON value of the tree, with aliases followed
 * and merge keys expanded, together with the unfilled values of its schema.
 *
 * The data also resolves the field paths of rules. A rule path starts from the field that
 * declares the rule, and its wildcards expand over the items and keys present in the instance.
 */
import type { JsonValue } from "../schema/json";
import { isJsonObject } from "../schema/json";
import type { YamlNode, YamlPath } from "../model";
import { effectiveEntries, resolveAliases } from "../form/entries";
import { ANY_ITEM, ANY_KEY, type PatternSegment } from "../paths/field-path";
import type { UnfilledValues } from "./unfilled";

/** JSON value of `tree`; an alias without target reads as the null value. */
export function instanceValue(tree: YamlNode): JsonValue {
  const node = resolveAliases(tree, null).node;
  if (node === null) return null;
  switch (node.kind) {
    case "scalar":
      return node.value;
    case "sequence":
      return node.items.map(instanceValue);
    case "mapping":
      return Object.fromEntries(
        effectiveEntries(node, null).map((entry) => [entry.key, instanceValue(entry.value)]),
      );
    case "alias":
      return null;
  }
}

/**
 * Copy of `value` without the entries of mappings that hold an unfilled value, at every depth.
 * The items of a sequence are kept, so the positions of the items stay those of the instance.
 */
export function pruneUnfilled(value: JsonValue, unfilled: UnfilledValues): JsonValue {
  if (Array.isArray(value)) {
    return (value as readonly JsonValue[]).map((item) => pruneUnfilled(item, unfilled));
  }
  if (isJsonObject(value)) {
    const entries = Object.entries(value).filter(([, child]) => !unfilled.has(child));
    return Object.fromEntries(entries.map(([key, child]) => [key, pruneUnfilled(child, unfilled)]));
  }
  return value;
}

/** Concrete paths bound by the two paths of one rule, for one expansion of their wildcards. */
export interface PathPair {
  readonly subject: YamlPath;
  readonly reference: YamlPath;
}

export class InstanceData {
  constructor(
    /** JSON value of the instance. */
    readonly value: JsonValue,
    readonly unfilled: UnfilledValues,
  ) {}

  static fromTree(tree: YamlNode, unfilled: UnfilledValues): InstanceData {
    return new InstanceData(instanceValue(tree), unfilled);
  }

  /** Value at `path`, or `undefined` when the instance holds no node there. */
  at(path: YamlPath): JsonValue | undefined {
    let current: JsonValue | undefined = this.value;
    for (const segment of path) {
      if (typeof segment === "number") {
        current = Array.isArray(current) ? (current as readonly JsonValue[])[segment] : undefined;
      } else {
        current =
          isJsonObject(current) && Object.prototype.hasOwnProperty.call(current, segment)
            ? current[segment]
            : undefined;
      }
      if (current === undefined) return undefined;
    }
    return current;
  }

  /** Whether the node at `path` is present and holds a value other than an unfilled one. */
  isFilled(path: YamlPath): boolean {
    return !this.unfilled.has(this.at(path));
  }

  /**
   * Concrete paths designated by `pattern` from `base`. A key or a position designates its node
   * even when the instance lacks it, so a rule can name an absent field; a wildcard expands over
   * the items or the keys present, and over no node when the node has another shape.
   */
  expand(base: YamlPath, pattern: readonly PatternSegment[]): YamlPath[] {
    let paths: YamlPath[] = [base];
    for (const segment of pattern) {
      paths = paths.flatMap((path) => this.step(path, segment));
    }
    return paths;
  }

  /**
   * Pairs of concrete paths designated by two paths of one rule, from `base`. The segments that
   * both paths share from their start expand once, so a wildcard of that common prefix binds the
   * same item in both paths. A wildcard of `subject` after the prefix expands over every match.
   * The caller ensures that `reference` holds no wildcard after the prefix.
   */
  pairs(
    base: YamlPath,
    subject: readonly PatternSegment[],
    reference: readonly PatternSegment[],
  ): PathPair[] {
    const shared = commonPrefixLength(subject, reference);
    return this.expand(base, subject.slice(0, shared)).flatMap((prefix) => {
      const tail = reference.slice(shared) as YamlPath;
      return this.expand(prefix, subject.slice(shared)).map((path) => ({
        subject: path,
        reference: [...prefix, ...tail],
      }));
    });
  }

  private step(path: YamlPath, segment: PatternSegment): YamlPath[] {
    if (segment === ANY_ITEM) {
      const value = this.at(path);
      return Array.isArray(value) ? value.map((_, index) => [...path, index]) : [];
    }
    if (segment === ANY_KEY) {
      const value = this.at(path);
      return isJsonObject(value) ? Object.keys(value).map((key) => [...path, key]) : [];
    }
    return [[...path, segment]];
  }
}

/** Number of segments that two paths share from their start. */
export function commonPrefixLength(
  a: readonly PatternSegment[],
  b: readonly PatternSegment[],
): number {
  let length = 0;
  while (length < a.length && length < b.length && a[length] === b[length]) length += 1;
  return length;
}

/** Whether `pattern` holds a wildcard. */
export function hasWildcard(pattern: readonly PatternSegment[]): boolean {
  return pattern.some((segment) => segment === ANY_ITEM || segment === ANY_KEY);
}
