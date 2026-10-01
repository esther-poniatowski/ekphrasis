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
  /** Source range, or `null` for nodes absent from the source (e.g. empty values). */
  readonly range: SourceRange | null;
}

export interface ScalarNode extends BaseNode {
  readonly kind: "scalar";
  readonly value: string | number | boolean | null;
  readonly style: ScalarStyle;
}

export interface MappingEntry {
  readonly key: string;
  readonly value: YamlNode;
}

export interface MappingNode extends BaseNode {
  readonly kind: "mapping";
  readonly entries: readonly MappingEntry[];
}

export interface SequenceNode extends BaseNode {
  readonly kind: "sequence";
  readonly items: readonly YamlNode[];
}

export type YamlNode = ScalarNode | MappingNode | SequenceNode;
