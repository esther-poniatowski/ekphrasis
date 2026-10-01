/**
 * Reading of the modeline that binds an instance to its schema, in the syntax of the YAML
 * language server: `# yaml-language-server: $schema=<path>`.
 *
 * The modeline is read from the text rather than from the parsed tree, so a file that fails to
 * parse still resolves its schema, and the form can report the parse error against that schema.
 */

const MODELINE = /^#\s*yaml-language-server\s*:\s*\$schema=(\S+)\s*$/;

/**
 * Schema reference written in the modeline of `text`, as written, or `null` without a modeline.
 *
 * Only the leading comment lines are searched, together with the blank lines among them, so a
 * modeline quoted inside a value or a later comment binds nothing.
 */
export function readModeline(text: string): string | null {
  const body = text.startsWith("﻿") ? text.slice(1) : text;
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") continue;
    if (!line.startsWith("#")) return null;
    const reference = MODELINE.exec(line)?.[1];
    if (reference !== undefined) return reference;
  }
  return null;
}
