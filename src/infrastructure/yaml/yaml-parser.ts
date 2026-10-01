/**
 * Implementation of the `DocumentParser` port with the `yaml` library.
 *
 * The `yaml` library is selected for its concrete syntax tree: it preserves scalar styles,
 * comments and source ranges, which source-preserving writes require.
 */
import { isAlias, isMap, isScalar, isSeq, parseDocument, type Document } from "yaml";
import type { DocumentParser } from "../../application";
import type { ScalarNode, ScalarStyle, SourceRange, YamlNode } from "../../domain";
import { YamlParseError } from "../../errors";

/** Mapping from the scalar types of the `yaml` library to domain styles. */
const STYLES: Readonly<Record<string, ScalarStyle>> = {
  PLAIN: "plain",
  QUOTE_SINGLE: "single-quoted",
  QUOTE_DOUBLE: "double-quoted",
  BLOCK_LITERAL: "literal",
  BLOCK_FOLDED: "folded",
};

const EMPTY: ScalarNode = { kind: "scalar", value: null, style: "plain", range: null };

export class YamlDocumentParser implements DocumentParser {
  parse(source: string): YamlNode {
    const document = parseDocument(source);
    const [error] = document.errors;
    if (error) {
      const position = error.linePos?.[0];
      throw position
        ? new YamlParseError(error.message, { line: position.line, column: position.col })
        : new YamlParseError(error.message);
    }
    return new TreeConverter(document).convert(document.contents);
  }
}

/** Converts the nodes of one parsed document into domain nodes, resolving its aliases. */
class TreeConverter {
  /** Nodes under conversion, so an alias to one of its ancestors is not followed. */
  private readonly ancestors = new Set<unknown>();

  constructor(private readonly document: Document.Parsed) {}

  convert(node: unknown): YamlNode {
    if (this.ancestors.has(node)) return EMPTY;
    this.ancestors.add(node);
    try {
      return this.convertNode(node);
    } finally {
      this.ancestors.delete(node);
    }
  }

  private convertNode(node: unknown): YamlNode {
    if (isScalar(node)) {
      return {
        kind: "scalar",
        value: toScalarValue(node.value),
        style: STYLES[node.type ?? "PLAIN"] ?? "plain",
        range: toRange(node.range),
      };
    }
    if (isMap(node)) {
      return {
        kind: "mapping",
        range: toRange(node.range),
        entries: node.items.map((pair) => ({
          key: toKey(isScalar(pair.key) ? pair.key.value : pair.key),
          value: this.convert(pair.value),
        })),
      };
    }
    if (isSeq(node)) {
      return {
        kind: "sequence",
        range: toRange(node.range),
        items: node.items.map((item) => this.convert(item)),
      };
    }
    if (isAlias(node)) {
      const target = node.resolve(this.document);
      return {
        kind: "alias",
        name: node.source,
        range: toRange(node.range),
        target: target === undefined || this.ancestors.has(target) ? null : this.convert(target),
      };
    }
    // Empty documents and empty values, written as a bare key.
    return EMPTY;
  }
}

function toRange(range: readonly number[] | null | undefined): SourceRange | null {
  const [start, end] = range ?? [];
  return start === undefined || end === undefined ? null : { start, end };
}

function toScalarValue(value: unknown): ScalarNode["value"] {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return value instanceof Date ? value.toISOString() : JSON.stringify(value);
}

function toKey(key: unknown): string {
  const value = toScalarValue(key);
  return value === null ? "" : String(value);
}
