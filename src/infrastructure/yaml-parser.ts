/**
 * Implementation of the `DocumentParser` port with the `yaml` library.
 *
 * The `yaml` library is selected for its concrete syntax tree: it preserves scalar styles,
 * comments and source ranges, which source-preserving writes require.
 */
import { isMap, isScalar, isSeq, parseDocument } from "yaml";
import type { DocumentParser } from "../application";
import type { ScalarNode, ScalarStyle, SourceRange, YamlNode } from "../domain";
import { YamlParseError } from "../errors";

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
    return toDomain(document.contents);
  }
}

function toDomain(node: unknown): YamlNode {
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
        value: toDomain(pair.value),
      })),
    };
  }
  if (isSeq(node)) {
    return { kind: "sequence", range: toRange(node.range), items: node.items.map(toDomain) };
  }
  // Empty documents and empty values; aliases are not resolved yet and also fall here.
  return EMPTY;
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
