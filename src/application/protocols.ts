/**
 * Ports of the application layer.
 *
 * Interfaces through which the application consumes capabilities implemented in outer layers
 * (dependency inversion): parsing (infrastructure) and host file access (adapters).
 */
import type { YamlNode } from "../domain";

/** Converts a source text into the domain tree; raises `YamlParseError` on invalid input. */
export interface DocumentParser {
  parse(source: string): YamlNode;
}

/** Read access to text files of the host (e.g. JSON Schemas stored in the vault). */
export interface FileSource {
  read(path: string): Promise<string | null>;
}
