/**
 * Predefined checkers of field scope that read a text: `word-count`, `sentence-count`,
 * `inline-markdown` and `latex`. Each checks the value of the field that declares it, and skips
 * a value other than a text, since the keyword `type` reports such a value.
 */
import type { BoundRule, Checker, RuleArguments, RuleContext } from "./declaration";

/** Text held by the field that declares the rule, or `null` for another value. */
function textAt(context: RuleContext): string | null {
  const value = context.data.at(context.base);
  return typeof value === "string" ? value : null;
}

/** Bounds `min` and `max` of a count; at least one is required. */
function countBounds(args: RuleArguments): { min: number | null; max: number | null } {
  const min = args.number("min");
  const max = args.number("max");
  if (min === null && max === null) args.fail("it requires the argument `min`, `max`, or both");
  if (min !== null && max !== null && min > max)
    args.fail("its bound `min` exceeds its bound `max`");
  return { min, max };
}

/** Checker bounding a count of units of the text, between `min` and `max`. */
function countChecker(name: string, unit: string, count: (text: string) => number): Checker {
  return {
    name,
    bind(args) {
      const { min, max } = countBounds(args);
      args.finish();
      return (context) => {
        const text = textAt(context);
        if (text === null) return [];
        const value = count(text);
        const plural = value === 1 ? unit : `${unit}s`;
        if (min !== null && value < min) {
          return [
            {
              path: context.base,
              message: `The text holds ${value} ${plural}, whereas at least ${min} are required.`,
            },
          ];
        }
        if (max !== null && value > max) {
          return [
            {
              path: context.base,
              message: `The text holds ${value} ${plural}, whereas at most ${max} are admitted.`,
            },
          ];
        }
        return [];
      };
    },
  };
}

/** Number of words: maximal runs of characters other than whitespace. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word !== "").length;
}

/**
 * Number of sentences. A sentence ends at a period, an exclamation mark, a question mark or an
 * ellipsis followed by whitespace, or at the end of the text; an abbreviation such as `e.g.`
 * followed by a space therefore ends a sentence.
 */
export function countSentences(text: string): number {
  return text.split(/(?<=[.!?…])\s+/).filter((sentence) => sentence.trim() !== "").length;
}

/** Markdown block constructs, each recognized by the start of a line. */
const BLOCK_CONSTRUCTS: readonly { readonly name: string; readonly line: RegExp }[] = [
  { name: "a heading", line: /^ {0,3}#{1,6}(\s|$)/ },
  { name: "a list item", line: /^ {0,3}([-*+]|\d{1,9}[.)])\s/ },
  { name: "a quote or a callout", line: /^ {0,3}>/ },
  { name: "a code block", line: /^ {0,3}(```|~~~)/ },
  { name: "a horizontal rule", line: /^ {0,3}([-*_])( *\1){2,} *$/ },
  { name: "a table row", line: /^ {0,3}\|/ },
  { name: "a block of display mathematics", line: /^ {0,3}\$\$/ },
];

/**
 * First Markdown block construct of `text`, with its line counted from 1, or `null` when the
 * text holds inline Markdown only. A blank line between two lines of text separates paragraphs.
 */
export function findBlockConstruct(text: string): { name: string; line: number } | null {
  const lines = text.split("\n");
  const filled = lines.flatMap((line, index) => (line.trim() === "" ? [] : [index]));
  const first = filled[0] ?? 0;
  const last = filled.at(-1) ?? 0;
  for (const [index, line] of lines.entries()) {
    const construct = BLOCK_CONSTRUCTS.find(({ line: pattern }) => pattern.test(line));
    if (construct !== undefined) return { name: construct.name, line: index + 1 };
    if (line.trim() === "" && index > first && index < last) {
      return { name: "a paragraph break", line: index + 1 };
    }
  }
  return null;
}

const inlineMarkdown: Checker = {
  name: "inline-markdown",
  bind(args): BoundRule {
    args.finish();
    return (context) => {
      const text = textAt(context);
      const construct = text === null ? null : findBlockConstruct(text);
      if (construct === null) return [];
      return [
        {
          path: context.base,
          message: `The text holds ${construct.name} at line ${construct.line}, whereas the field admits inline Markdown only.`,
        },
      ];
    };
  },
};

const latex: Checker = {
  name: "latex",
  bind(args): BoundRule {
    args.finish();
    return (context) => {
      const text = textAt(context);
      const error = text === null ? null : context.environment.formulaError(text);
      return error === null
        ? []
        : [{ path: context.base, message: `The formula fails to render: ${error}` }];
    };
  },
};

export const TEXT_CHECKERS: readonly Checker[] = [
  countChecker("word-count", "word", countWords),
  countChecker("sentence-count", "sentence", countSentences),
  inlineMarkdown,
  latex,
];
