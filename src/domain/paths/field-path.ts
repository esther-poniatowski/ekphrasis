/**
 * Field paths: the textual designation of a node of an instance, shared by the controls, the
 * issues, the rules and the outline (e.g. `subject.foils[1].symbol`, `maturity["task.aim"]`).
 *
 * A key follows a dot, except at the start of the path; a position in a sequence stands between
 * brackets; a key that the dotted form cannot hold stands between brackets as a JSON string. The
 * wildcards `[*]` and `*` are admitted by the parser only, since a printed path designates one
 * node.
 */
import { EkphrasisError } from "../../errors";
import type { YamlPath } from "../model";

/** Wildcard matching every item of a sequence (`[*]`). */
export const ANY_ITEM: unique symbol = Symbol("any-item");

/** Wildcard matching every key of a mapping (`*`). */
export const ANY_KEY: unique symbol = Symbol("any-key");

/** Segment of a path written in a rule, where wildcards are admitted. */
export type PatternSegment = string | number | typeof ANY_ITEM | typeof ANY_KEY;

/** Raised when a text is not a well-formed field path. */
export class FieldPathError extends EkphrasisError {
  override name = "FieldPathError";
}

/** A key written without brackets: no dot, bracket, quote or whitespace, and not a wildcard. */
const BARE_KEY = /^[^.[\]"'\s*]+$/;

/** Prints a path in its canonical form; the root path prints as `""`. */
export function printFieldPath(path: YamlPath): string {
  return path
    .map((segment, index) => {
      if (typeof segment === "number") return `[${segment}]`;
      if (BARE_KEY.test(segment)) return index === 0 ? segment : `.${segment}`;
      return `[${JSON.stringify(segment)}]`;
    })
    .join("");
}

/** Prints a path that may hold wildcards, such as the path of a subschema of items. */
export function printPatternPath(path: readonly PatternSegment[]): string {
  return path
    .map((segment, index) => {
      if (segment === ANY_ITEM) return "[*]";
      if (segment === ANY_KEY) return index === 0 ? "*" : ".*";
      const printed = printFieldPath([segment]);
      return index === 0 || printed.startsWith("[") ? printed : `.${printed}`;
    })
    .join("");
}

/**
 * Parses a path, with its wildcards; the empty text designates the root.
 *
 * @throws FieldPathError When the text is not a well-formed path, with the offending offset.
 */
export function parseFieldPath(text: string): PatternSegment[] {
  const segments: PatternSegment[] = [];
  let index = 0;
  const fail = (reason: string): never => {
    throw new FieldPathError(`Invalid field path \`${text}\` at offset ${index}: ${reason}.`);
  };
  while (index < text.length) {
    const char = text[index];
    if (char === "[") {
      const close = closingBracket(text, index);
      if (close < 0) fail("unclosed bracket");
      segments.push(bracketSegment(text.slice(index + 1, close), fail));
      index = close + 1;
      continue;
    }
    if (segments.length > 0) {
      if (char !== ".") fail("expected a dot or a bracket");
      index += 1;
    }
    const match = /^[^.[\]]*/.exec(text.slice(index))?.[0] ?? "";
    if (match === "") fail("empty key");
    segments.push(match === "*" ? ANY_KEY : match);
    index += match.length;
  }
  return segments;
}

/** Offset of the bracket closing the one at `open`, skipping the content of a JSON string. */
function closingBracket(text: string, open: number): number {
  let inString = false;
  for (let index = open + 1; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (char === "\\") index += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === "]") {
      return index;
    }
  }
  return -1;
}

function bracketSegment(content: string, fail: (reason: string) => never): PatternSegment {
  if (content === "*") return ANY_ITEM;
  if (/^\d+$/.test(content)) return Number(content);
  if (content.startsWith('"')) {
    try {
      const key: unknown = JSON.parse(content);
      if (typeof key === "string") return key;
    } catch {
      // Reported below with the position of the segment.
    }
    return fail("malformed quoted key");
  }
  return fail("expected an index, a quoted key or `*` between brackets");
}
