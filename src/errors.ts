/**
 * Error hierarchy of the plugin.
 *
 * Every expected failure derives from {@link EkphrasisError}, which allows adapters to report
 * domain failures to the user while propagating programming errors unchanged.
 *
 * Names are assigned explicitly (rather than through `new.target.name`) so that they survive
 * identifier mangling in minified production bundles.
 */

/** Position in a source text (1-based line and column), with the text of that line. */
export interface SourcePosition {
  readonly line: number;
  readonly column: number;
  /** Text of the line at `line`, without its line break, so a message can quote it. */
  readonly lineText: string;
}

/** Base class of all expected failures raised by the plugin. */
export class EkphrasisError extends Error {
  override name = "EkphrasisError";
}

/** Raised when a YAML source cannot be parsed into a document tree. */
export class YamlParseError extends EkphrasisError {
  override name = "YamlParseError";

  constructor(
    message: string,
    readonly position?: SourcePosition,
  ) {
    super(message);
  }
}

/**
 * Raised when planned edits cannot be applied to a source text: no scalar token starts at the
 * offset of a rewrite, or two edits overlap. The text is then left unchanged.
 */
export class SourceEditError extends EkphrasisError {
  override name = "SourceEditError";
}

/** Base class of the failures to load or interpret a schema, located by the schema file. */
export class SchemaError extends EkphrasisError {
  override name = "SchemaError";

  constructor(
    message: string,
    /** Vault path of the schema file at fault. */
    readonly schemaPath: string,
    /** Further vault paths whose change can repair the failure, such as the schema registry. */
    readonly dependencies: readonly string[] = [],
  ) {
    super(message);
  }
}

/** Raised when a schema file is missing, unreadable, or not a JSON or YAML object. */
export class SchemaLoadError extends SchemaError {
  override name = "SchemaLoadError";
}

/** Raised when a `$ref` of a schema designates no loaded schema, or loops without progress. */
export class SchemaReferenceError extends SchemaError {
  override name = "SchemaReferenceError";
}

/** Raised when the validator refuses to compile a schema, for instance for an invalid pattern. */
export class SchemaCompileError extends SchemaError {
  override name = "SchemaCompileError";
}
