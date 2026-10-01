/**
 * Glob patterns matched against vault paths, for the path rules of the settings.
 *
 * The syntax is the common subset of the glob dialects used by YAML tools:
 *
 * - `*` matches any characters except `/`, and `?` one character except `/`;
 * - `**` as a whole segment matches any number of folders, including none;
 * - `{a,b}` matches either alternative, and alternatives may nest;
 * - `[abc]`, `[a-z]` and `[!abc]` match one character of a class or outside it;
 * - `\` makes the next character literal.
 *
 * A pattern matches the whole path from the vault root; a leading `/` is ignored. The matcher is
 * implemented here rather than imported, so the domain keeps no dependency.
 */

/** Characters that carry a meaning in a regular expression and must be escaped as literals. */
const REGEX_SPECIAL = /[\\^$.*+?()[\]{}|/]/g;

const escapeLiteral = (text: string): string => text.replace(REGEX_SPECIAL, "\\$&");

/** A compiled glob pattern. */
export class GlobPattern {
  private readonly regex: RegExp;

  constructor(readonly source: string) {
    const pattern = source.startsWith("/") ? source.slice(1) : source;
    this.regex = new RegExp(`^${compile(pattern)}$`);
  }

  /** Whether `path`, relative to the vault root, matches the whole pattern. */
  matches(path: string): boolean {
    return this.regex.test(path);
  }
}

/** Translates a glob into the source of an equivalent regular expression. */
function compile(pattern: string): string {
  let out = "";
  let index = 0;
  while (index < pattern.length) {
    const char = pattern[index] as string;
    const atSegmentStart = index === 0 || pattern[index - 1] === "/";
    if (char === "*" && pattern[index + 1] === "*" && atSegmentStart) {
      const next = pattern[index + 2];
      if (next === "/") {
        out += "(?:[^/]*/)*";
        index += 3;
        continue;
      }
      if (next === undefined) {
        out += ".*";
        index += 2;
        continue;
      }
    }
    if (char === "*") {
      out += "[^/]*";
      index += pattern[index + 1] === "*" ? 2 : 1;
    } else if (char === "?") {
      out += "[^/]";
      index += 1;
    } else if (char === "\\" && index + 1 < pattern.length) {
      out += escapeLiteral(pattern[index + 1] as string);
      index += 2;
    } else if (char === "{") {
      const close = closingBrace(pattern, index);
      if (close < 0) {
        out += escapeLiteral(char);
        index += 1;
      } else {
        const alternatives = splitAlternatives(pattern.slice(index + 1, close));
        out += `(?:${alternatives.map(compile).join("|")})`;
        index = close + 1;
      }
    } else if (char === "[") {
      const close = pattern.indexOf("]", index + 2);
      if (close < 0) {
        out += escapeLiteral(char);
        index += 1;
      } else {
        out += characterClass(pattern.slice(index + 1, close));
        index = close + 1;
      }
    } else {
      out += escapeLiteral(char);
      index += 1;
    }
  }
  return out;
}

function closingBrace(pattern: string, open: number): number {
  let depth = 0;
  for (let index = open; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "\\") index += 1;
    else if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return index;
  }
  return -1;
}

/** Splits the content of braces at its top-level commas. */
function splitAlternatives(content: string): string[] {
  const alternatives: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (char === "\\") index += 1;
    else if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
    else if (char === "," && depth === 0) {
      alternatives.push(content.slice(start, index));
      start = index + 1;
    }
  }
  alternatives.push(content.slice(start));
  return alternatives;
}

/** Translates the content of a bracket expression; a class never matches `/`. */
function characterClass(content: string): string {
  const negated = content.startsWith("!") || content.startsWith("^");
  const body = (negated ? content.slice(1) : content).replace(/[\\\]^]/g, "\\$&");
  return negated ? `[^/${body}]` : `(?!/)[${body}]`;
}
