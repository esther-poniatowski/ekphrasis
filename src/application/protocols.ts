/**
 * Ports of the application layer.
 *
 * Interfaces through which the application consumes capabilities implemented in outer layers
 * (dependency inversion): parsing, editing and schema loading (infrastructure), and host file
 * access (adapters).
 */
import type { JsonValue, SchemaSet, SourceEdit, ValidatorError, YamlNode } from "../domain";

/** Converts a source text into the domain tree; raises `YamlParseError` on invalid input. */
export interface DocumentParser {
  parse(source: string): YamlNode;
}

/**
 * Applies the edits planned by the domain to a source text: writes the text of each scalar in its
 * selected style, and splices it, leaving every other character unchanged.
 */
export interface DocumentEditor {
  /** Text of `source` after `edits`, which must not overlap. */
  apply(source: string, edits: readonly SourceEdit[]): string;
}

/** Read access to text files of the host (e.g. JSON Schemas stored in the vault). */
export interface FileSource {
  /** Text of the file at the vault path `path`, or `null` when no such file exists. */
  read(path: string): Promise<string | null>;
}

/**
 * Loads a schema file with every schema file that its references reach; raises `SchemaError`
 * when a file is missing or malformed, or when a reference designates no schema.
 */
export interface SchemaLoader {
  load(path: string): Promise<SchemaSet>;
}

/** Validator of instances against the schemas of one schema set, compiled once. */
export interface InstanceValidator {
  /** Errors of `instance`, in the order of the validator. */
  validate(instance: JsonValue): readonly ValidatorError[];
}

/**
 * Compiles a schema set for a JSON Schema validator of draft 2020-12 that accepts the keywords
 * prefixed `x-`; raises `SchemaCompileError` when the validator refuses a schema.
 */
export interface SchemaValidator {
  compile(schemas: SchemaSet): InstanceValidator;
}
