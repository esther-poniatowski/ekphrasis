/**
 * Domain model: host-independent representation of YAML documents.
 *
 * The tree retains nothing tied to a parser implementation: node kinds, scalar values, lexical
 * scalar styles (which encode authoring intent, e.g. a literal block scalar for prose) and source
 * ranges (which locate the text that a commit replaces).
 */

// --- Document Tree -------------------------------------------------------------------------------

/** Path from the document root to a node, as a sequence of mapping keys and sequence indices. */
export type YamlPath = readonly (string | number)[];

/** Half-open range `[start, end)` of character offsets in the source text. */
export interface SourceRange {
  readonly start: number;
  readonly end: number;
}

/** Lexical style of a scalar in the source text. */
export type ScalarStyle = "plain" | "single-quoted" | "double-quoted" | "literal" | "folded";

interface BaseNode {
  /**
   * Source range, or `null` for a node that the parser could not locate. An empty value, written
   * as a bare key, has an empty range; the range of a block scalar includes its header and its
   * final line break.
   */
  readonly range: SourceRange | null;
}

export interface ScalarNode extends BaseNode {
  readonly kind: "scalar";
  readonly value: string | number | boolean | null;
  readonly style: ScalarStyle;
}

export interface MappingEntry {
  readonly key: string;
  /** Source range of the key, which locates the line of the entry for insertions and removals. */
  readonly keyRange: SourceRange | null;
  readonly value: YamlNode;
}

/**
 * Collection written between brackets or braces, whose entries are separated by commas rather
 * than placed on lines of their own.
 */
interface CollectionNode extends BaseNode {
  readonly flow: boolean;
}

export interface MappingNode extends CollectionNode {
  readonly kind: "mapping";
  readonly entries: readonly MappingEntry[];
}

export interface SequenceNode extends CollectionNode {
  readonly kind: "sequence";
  readonly items: readonly YamlNode[];
}

/**
 * Alias such as `*name`, with the node of its anchor. The target is `null` when the anchor is
 * undefined, or when the alias refers to one of its own ancestors (a recursive structure).
 *
 * The alias keeps its own range: the text of the anchored node lies elsewhere, so a commit at
 * the alias must not reach the target, and the form displays the target as locked.
 */
export interface AliasNode extends BaseNode {
  readonly kind: "alias";
  readonly name: string;
  readonly target: YamlNode | null;
}

export type YamlNode = ScalarNode | MappingNode | SequenceNode | AliasNode;

/** Value of a scalar node. */
export type ScalarValue = ScalarNode["value"];

/** Key of a mapping entry that merges the entries of other mappings into its own mapping. */
export const MERGE_KEY = "<<";
