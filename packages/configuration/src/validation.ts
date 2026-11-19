/** The check of a configuration `ekphrasis:configuration@1` against the schema that Ekphrasis publishes. */
import { Ajv2020 } from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import { CONFIGURATION_SCHEMA } from "./generated/schema.js";

/** One rule of the schema broken at one node of a configuration. */
export interface ConfigurationIssue {
  /** JSON Pointer of the node of the configuration at which the rule fails. */
  readonly pointer: string;
  /** The rule broken, in words. */
  readonly message: string;
}

/** The contract identifier of the configuration. */
export const CONFIGURATION_FORMAT = "ekphrasis:configuration@1";

/** The absolute `$id` of the schema of the configuration. */
export const CONFIGURATION_SCHEMA_ID = String(CONFIGURATION_SCHEMA["$id"]);

let compiled: ValidateFunction | undefined;

/** Return every rule of the schema that a configuration breaks, empty when it conforms. */
export function configurationIssues(configuration: unknown): ConfigurationIssue[] {
  compiled ??= new Ajv2020({ allErrors: true, strict: false }).compile(CONFIGURATION_SCHEMA);
  if (compiled(configuration)) return [];
  return (compiled.errors ?? []).map((error) => ({
    pointer: error.instancePath,
    message: error.message ?? error.keyword,
  }));
}
