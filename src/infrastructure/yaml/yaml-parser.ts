/**
 * Implementation of the `DocumentParser` port with the `yaml` library.
 *
 * The `yaml` library is selected for its concrete syntax tree: it preserves scalar styles,
 * comments and source ranges, which source-preserving writes require.
 */
import {
  CST,
  isAlias,
  isMap,
  isNode,
  isScalar,
  isSeq,
  LineCounter,
  parseDocument,
  Parser,
  type Document,
} from "yaml";
import type { DocumentParser } from "../../application";
import type { ScalarNode, ScalarStyle, SourceRange, YamlNode } from "../../domain";
import { YamlParseError } from "../../errors";
import { nameBareSymbols } from "../library-messages";

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
    // Without pretty errors, the message holds no position and no excerpt of the source, so
    // the view displays each of them once, in a form of its own.
    const lines = new LineCounter();
    const document = parseDocument(source, { prettyErrors: false, lineCounter: lines });
    const [error] = document.errors;
    if (error) {
      const offset = unclosedBracketBefore(source, error.pos[0]) ?? error.pos[0];
      const { line, col } = lines.linePos(offset);
      const lineText = source.split(/\r?\n/)[line - 1] ?? "";
      throw new YamlParseError(nameBareSymbols(error.message), { line, column: col, lineText });
    }
    return new TreeConverter(document).convert(document.contents);
  }
}

/**
 * Offset of the opening bracket or brace of the innermost flow collection that starts before
 * `offset` and is never closed, or `null` when every flow collection before `offset` is closed.
 *
 * The parser detects an unclosed flow collection only where the text after it stops fitting,
 * usually on a later line, so its error position would point away from the missing bracket.
 */
function unclosedBracketBefore(source: string, offset: number): number | null {
  let found: number | null = null;
  for (const token of new Parser().parse(source)) {
    if (token.type !== "document") continue;
    CST.visit(token, (item) => {
      for (const node of [item.key, item.value]) {
        if (node?.type !== "flow-collection" || node.start.offset >= offset) continue;
        const closing = node.start.source === "[" ? "]" : "}";
        const closed = node.end.some((end) => end.source === closing);
        if (!closed && (found === null || node.start.offset > found)) found = node.start.offset;
      }
    });
  }
  return found;
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
        flow: node.flow === true,
        entries: node.items.map((pair) => ({
          key: toKey(isScalar(pair.key) ? pair.key.value : pair.key),
          keyRange: isNode(pair.key) ? toRange(pair.key.range) : null,
          value: this.convert(pair.value),
        })),
      };
    }
    if (isSeq(node)) {
      return {
        kind: "sequence",
        range: toRange(node.range),
        flow: node.flow === true,
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
