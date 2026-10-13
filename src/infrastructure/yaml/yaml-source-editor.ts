/**
 * Implementation of the `DocumentEditor` port with the concrete syntax tree of the `yaml` library.
 *
 * A rewritten scalar goes through `CST.setScalarValue` on its own token, which keeps the comments
 * and the indentation of the token; a new scalar goes through `CST.createScalarToken`. Both receive
 * the style selected by the domain as an explicit type, and the position flags of the context of
 * the scalar, as the decision on source-preserving writes requires.
 */
import { Composer, CST, Parser, visit, type Scalar } from "yaml";
import type { DocumentEditor } from "../../application";
import {
  INDENT_STEP,
  type ScalarContext,
  type ScalarPart,
  type ScalarRewrite,
  type ScalarStyle,
  type SourceEdit,
  type TextPart,
} from "../../domain";
import { SourceEditError } from "../../errors";

const TYPES: Readonly<Record<ScalarStyle, Scalar.Type>> = {
  plain: "PLAIN",
  "single-quoted": "QUOTE_SINGLE",
  "double-quoted": "QUOTE_DOUBLE",
  literal: "BLOCK_LITERAL",
  folded: "BLOCK_FOLDED",
};

/** Position flags of the `yaml` library for each scalar context. */
const FLAGS: Readonly<
  Record<ScalarContext, { afterKey?: boolean; inFlow?: boolean; implicitKey?: boolean }>
> = {
  "after-key": { afterKey: true },
  block: {},
  flow: { inFlow: true },
  key: { implicitKey: true },
};

/** Replacement of the text in `[start, end)` by `text`. */
interface Replacement {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export class YamlSourceEditor implements DocumentEditor {
  apply(source: string, edits: readonly SourceEdit[]): string {
    const replacements = edits.map((edit) =>
      edit.kind === "rewrite"
        ? rewrite(source, edit)
        : { start: edit.range.start, end: edit.range.end, text: edit.parts.map(partText).join("") },
    );
    // A stable sort keeps the planned order of insertions at one offset, such as the header and
    // the body of a block scalar written into an empty value at the end of the text.
    replacements.sort((a, b) => a.start - b.start);
    let result = "";
    let cursor = 0;
    for (const { start, end, text } of replacements) {
      if (start < cursor || end < start || end > source.length) {
        throw new SourceEditError(
          `The edits of the range ${start}–${end} overlap or exceed the text.`,
        );
      }
      result += source.slice(cursor, start) + text;
      cursor = end;
    }
    return result + source.slice(cursor);
  }
}

/** Replacement of the scalar token starting at the offset of `edit` by its rewritten text. */
function rewrite(source: string, edit: ScalarRewrite): Replacement {
  const tokens = Array.from(new Parser().parse(source));
  let found: CST.Token | undefined;
  for (const document of new Composer({ keepSourceTokens: true }).compose(tokens)) {
    visit(document, {
      Scalar(_, node) {
        if (node.srcToken?.offset !== edit.offset) return undefined;
        found = node.srcToken;
        return visit.BREAK;
      },
    });
    if (found !== undefined) break;
  }
  if (found === undefined) {
    throw new SourceEditError(`No scalar token starts at offset ${edit.offset}.`);
  }
  const { scalar } = edit;
  const end = edit.offset + CST.stringify(found).length;
  CST.setScalarValue(found, scalar.text, { ...FLAGS[scalar.context], type: TYPES[scalar.style] });
  return { start: edit.offset, end, text: CST.stringify(found) };
}

function partText(part: TextPart): string {
  return typeof part === "string" ? part : scalarPiece(part);
}

/**
 * Text of a new scalar, or of the header or body of a new block scalar. The lines of a block
 * scalar after a key are indented one step beyond the key, as `CST.setScalarValue` indents a
 * rewritten one.
 */
function scalarPiece({ scalar, piece }: ScalarPart): string {
  const indent = scalar.indent + (scalar.context === "after-key" ? INDENT_STEP : 0);
  const token = CST.createScalarToken(scalar.text, {
    ...FLAGS[scalar.context],
    indent,
    type: TYPES[scalar.style],
    end: [],
  });
  const text = CST.stringify(token);
  if (piece === "whole") return text;
  const lineBreak = token.type === "block-scalar" ? text.indexOf("\n") : -1;
  if (lineBreak < 0) return piece === "header" ? text : "";
  return piece === "header" ? text.slice(0, lineBreak) : text.slice(lineBreak + 1);
}
