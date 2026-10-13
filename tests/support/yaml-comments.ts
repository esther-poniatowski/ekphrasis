/**
 * Comments of a YAML text, read from the tokens of the `yaml` library, for tests that check
 * that an edit keeps every comment.
 */
import { Parser } from "yaml";

/** Text of every comment of `text`, in source order. */
export function commentsOf(text: string): string[] {
  return collectComments(Array.from(new Parser().parse(text)));
}

/** Collects the text of every comment token under `token`, in source order. */
export function collectComments(token: unknown, into: string[] = []): string[] {
  if (Array.isArray(token)) {
    for (const item of token) collectComments(item, into);
  } else if (typeof token === "object" && token !== null) {
    const record = token as Record<string, unknown>;
    if (record["type"] === "comment" && typeof record["source"] === "string") {
      into.push(record["source"]);
    }
    for (const value of Object.values(record)) collectComments(value, into);
  }
  return into;
}
