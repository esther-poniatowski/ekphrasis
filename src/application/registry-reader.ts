/**
 * Reader of the schema registry named by the settings. The binding reads its logical contract
 * identifiers, and the schema loader reads its absolute resources through the port
 * `SchemaResources`.
 */
import {
  instanceValue,
  isUri,
  readSchemaRegistry,
  resolveVaultPath,
  type RegistryDefect,
  type RegistryReading,
  type SchemaRegistry,
} from "../domain";
import { YamlParseError } from "../errors";
import type { DocumentParser, FileSource, ResourceMapping, SchemaResources } from "./protocols";
import type { EkphrasisSettings } from "./settings";

/** Outcome of reading the configured registry. */
export type RegistryState =
  /** The settings name no registry. */
  | { readonly status: "unconfigured" }
  | { readonly status: "read"; readonly path: string; readonly registry: SchemaRegistry }
  /** The registry cannot be read; `path` is absent when the setting names no vault file. */
  | {
      readonly status: "invalid";
      readonly reason: string;
      readonly defect: RegistryStateDefect;
      readonly path?: string;
    };

/**
 * Why the configured registry cannot be read: the setting names no vault file, the file is
 * absent, its text is no YAML, or its value declares an unsupported version or another structure.
 */
export type RegistryStateDefect = "location" | "absent" | "yaml" | RegistryDefect;

export class RegistryReader implements SchemaResources {
  constructor(
    private readonly parser: DocumentParser,
    private readonly files: FileSource,
    private readonly settings: () => EkphrasisSettings,
  ) {}

  /** Reads the registry named by the current settings. */
  async read(): Promise<RegistryState> {
    const reference = this.settings().schemaRegistry.trim();
    if (reference === "") return { status: "unconfigured" };
    if (isUri(reference)) {
      return {
        status: "invalid",
        reason: "the schema registry must be a vault file",
        defect: "location",
      };
    }
    const path = resolveVaultPath("", reference);
    if (path === null || path === "") {
      return {
        status: "invalid",
        reason: "the schema registry path leaves the vault",
        defect: "location",
      };
    }
    const source = await this.files.read(path);
    if (source === null) {
      return {
        status: "invalid",
        reason: `the registry \`${path}\` is absent`,
        defect: "absent",
        path,
      };
    }
    let reading: RegistryReading;
    try {
      reading = readSchemaRegistry(instanceValue(this.parser.parse(source)));
    } catch (error) {
      if (!(error instanceof YamlParseError)) throw error;
      return {
        status: "invalid",
        reason: `the registry \`${path}\` is invalid YAML`,
        defect: "yaml",
        path,
      };
    }
    return reading.status === "read"
      ? { status: "read", path, registry: reading.registry }
      : {
          status: "invalid",
          reason: `the registry \`${path}\` ${reading.reason}`,
          defect: reading.defect,
          path,
        };
  }

  async resources(): Promise<ResourceMapping> {
    const state = await this.read();
    if (state.status === "read") {
      return {
        status: "available",
        registryPath: state.path,
        resources: state.registry.resources,
        schemaPaths: [...state.registry.schemas.values(), ...state.registry.resources.values()]
          .map((target) => (isUri(target) ? null : resolveVaultPath("", target)))
          .filter((path): path is string => path !== null && path !== ""),
      };
    }
    if (state.status === "unconfigured") {
      return { status: "unavailable", reason: "no schema registry is configured" };
    }
    return {
      status: "unavailable",
      reason: state.reason,
      ...(state.path === undefined ? {} : { registryPath: state.path }),
    };
  }
}
