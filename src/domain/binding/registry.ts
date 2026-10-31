/**
 * Schema registry: the YAML file named by the settings, which maps each logical contract
 * identifier to the vault path of its schema (key `schemas`) and, from version 2, each absolute
 * `$id` to the vault path of the schema file declaring it (key `resources`).
 *
 * Version 1 holds `schemas` only. Version 2 adds the top-level mapping `resources`, whose keys
 * are absolute URIs written exactly as the `$id` of their files, so that a `$ref` by absolute URI
 * resolves to a file of the vault without any request over the network. A registry without the
 * key `schema_version` reads as version 1, the only format without `resources`.
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

/** Outcome of reading the parsed value of a registry file. */
export type RegistryReading =
  | { readonly status: "read"; readonly registry: SchemaRegistry }
  /** The value is no registry; `reason` completes a sentence opening on the registry path. */
  | { readonly status: "malformed"; readonly reason: string };

/** Reads the parsed value of a registry file. */
export function readSchemaRegistry(value: JsonValue): RegistryReading {
  const malformed = (reason: string): RegistryReading => ({ status: "malformed", reason });
  if (!isJsonObject(value) || !isJsonObject(value["schemas"])) {
    return malformed("has no schemas mapping");
  }
  const declared = value["schema_version"];
  const version = declared === undefined ? 1 : declared;
  if (version !== 1 && version !== 2) {
    return malformed(`declares the unsupported schema_version \`${JSON.stringify(declared)}\``);
  }
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

/** Entries of `mapping` when every value is a string, else `null`. */
function pathMapping(mapping: JsonObject): Map<string, string> | null {
  const entries = Object.entries(mapping);
  if (entries.some(([, target]) => typeof target !== "string")) return null;
  return new Map(entries as [string, string][]);
}
