/**
 * Schema registry: the YAML file named by the settings, which maps each logical contract
 * identifier to the vault path of its schema (key `schemas`) and, from version 2, each absolute
 * `$id` to the vault path of the schema file declaring it (key `resources`).
 *
 * Version 1 holds `schemas` only. Version 2 adds the top-level mapping `resources`, whose keys
 * are absolute URIs written exactly as the `$id` of their files, so that a `$ref` by absolute URI
 * resolves to a file of the vault without any request over the network. The current format uses
 * `_schema: kleisis:schema-registry@2`; the two numeric `schema_version` markers remain readable
 * while existing registries migrate.
 */
import { isUri } from "../files/vault-paths";
import { isJsonObject, type JsonObject, type JsonValue } from "../schema/json";

/** Content of a well-formed registry. */
export interface SchemaRegistry {
  readonly version: 1 | 2;
  /** Logical contract identifiers mapped to the vault paths of their schemas, unchecked. */
  readonly schemas: ReadonlyMap<string, string>;
  /** Absolute `$id` strings mapped to the vault paths of their files, unchecked; empty in version 1. */
  readonly resources: ReadonlyMap<string, string>;
}

/**
 * Defect of a malformed registry: a declared version that no reader supports, or a structure
 * that the declared version does not admit.
 */
export type RegistryDefect = "version" | "structure";

/** Outcome of reading the parsed value of a registry file. */
export type RegistryReading =
  | { readonly status: "read"; readonly registry: SchemaRegistry }
  /** The value is no registry; `reason` completes a sentence opening on the registry path. */
  | { readonly status: "malformed"; readonly reason: string; readonly defect: RegistryDefect };

/** Versions of the registry format that this reader supports. */
export const SUPPORTED_REGISTRY_VERSIONS: readonly number[] = [1, 2];

const CURRENT_REGISTRY_MARKER = "kleisis:schema-registry@2";

/** Reads the parsed value of a registry file. */
export function readSchemaRegistry(value: JsonValue): RegistryReading {
  const malformed = (reason: string, defect: RegistryDefect = "structure"): RegistryReading => ({
    status: "malformed",
    reason,
    defect,
  });
  if (!isJsonObject(value)) return malformed("has no schemas mapping");
  const format = registryFormat(value);
  if (format === null) {
    return malformed(`must write _schema: ${CURRENT_REGISTRY_MARKER}`, "version");
  }
  if (format.current && Object.keys(value)[0] !== "_schema") {
    return malformed("must write _schema as its first key");
  }
  if (format.current) {
    const admitted = new Set(["_schema", "schemas", "exports", "resources"]);
    const extra = Object.keys(value).find((key) => !admitted.has(key));
    if (extra !== undefined) return malformed(`declares the unadmitted key \`${extra}\``);
  }
  if (!isJsonObject(value["schemas"])) return malformed("has no schemas mapping");
  const version = format.version;
  const schemas = pathMapping(value["schemas"]);
  if (schemas === null) return malformed("contains a non-path value");
  const written = value["resources"];
  if (written !== undefined && version === 1) {
    return malformed("declares resources, which require schema_version 2");
  }
  if (written !== undefined && !isJsonObject(written)) {
    return malformed("has a resources key that holds no mapping");
  }
  const resources = written === undefined ? new Map<string, string>() : pathMapping(written);
  if (resources === null) return malformed("contains a non-path value");
  const relative = [...resources.keys()].find((key) => !isUri(key));
  if (relative !== undefined) {
    return malformed(`maps the resource \`${relative}\`, which is no absolute URI`);
  }
  return { status: "read", registry: { version, schemas, resources } };
}

/** Format selected by exactly one admitted registry marker, else `null`. */
function registryFormat(
  value: JsonObject,
): { readonly version: 1 | 2; readonly current: boolean } | null {
  const marker = value["_schema"];
  const legacy = value["schema_version"];
  if (marker !== undefined && legacy !== undefined) return null;
  if (marker !== undefined) {
    return marker === CURRENT_REGISTRY_MARKER ? { version: 2, current: true } : null;
  }
  return legacy === 1 || legacy === 2 ? { version: legacy, current: false } : null;
}

/** Entries of `mapping` when every value is a string, else `null`. */
function pathMapping(mapping: JsonObject): Map<string, string> | null {
  const entries = Object.entries(mapping);
  if (entries.some(([, target]) => typeof target !== "string")) return null;
  return new Map(entries as [string, string][]);
}
