/**
 * Error hierarchy of the plugin.
 *
 * Every expected failure derives from {@link EkphrasisError}, which allows adapters to report
 * domain failures to the user while propagating programming errors unchanged.
 *
 * Names are assigned explicitly (rather than through `new.target.name`) so that they survive
 * identifier mangling in minified production bundles.
 */

/** Position in a source text (1-based line and column). */
export interface SourcePosition {
  readonly line: number;
  readonly column: number;
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
