/** Resolves schema bindings, loading a configured logical-identifier registry when required. */
import {
  instanceValue,
  isUri,
  isJsonObject,
  readSchemaField,
  resolveVaultPath,
  resolveBinding,
  type BindingResult,
} from "../domain";
import { YamlParseError } from "../errors";
import type { BindingResolver, DocumentParser, FileSource } from "./protocols";
import type { EkphrasisSettings } from "./settings";

export class BindingService implements BindingResolver {
  constructor(
    private readonly parser: DocumentParser,
    private readonly files: FileSource,
    private readonly settings: () => EkphrasisSettings,
  ) {}

  async resolve(path: string, text: string): Promise<BindingResult> {
    const settings = this.settings();
    const identifier = readSchemaField(text);
    if (identifier === null) return resolveBinding(path, text, settings.pathRules);
    const registryReference = settings.schemaRegistry.trim();
    if (registryReference === "") return resolveBinding(path, text, settings.pathRules);
    if (isUri(registryReference)) {
      return this.invalid(identifier, "the schema registry must be a vault file");
    }
    const registryPath = resolveVaultPath("", registryReference);
    if (registryPath === null || registryPath === "") {
      return this.invalid(identifier, "the schema registry path leaves the vault");
    }
    const source = await this.files.read(registryPath);
    if (source === null)
      return this.invalid(identifier, `the registry \`${registryPath}\` is absent`, registryPath);
    try {
      const value = instanceValue(this.parser.parse(source));
      if (!isJsonObject(value) || !isJsonObject(value["schemas"])) {
        return this.invalid(
          identifier,
          `the registry \`${registryPath}\` has no schemas mapping`,
          registryPath,
        );
      }
      const entries = Object.entries(value["schemas"]);
      if (entries.some(([, target]) => typeof target !== "string")) {
        return this.invalid(
          identifier,
          `the registry \`${registryPath}\` contains a non-path value`,
          registryPath,
        );
      }
      return resolveBinding(
        path,
        text,
        settings.pathRules,
        new Map(entries as [string, string][]),
        registryPath,
      );
    } catch (error) {
      if (error instanceof YamlParseError) {
        return this.invalid(
          identifier,
          `the registry \`${registryPath}\` is invalid YAML`,
          registryPath,
        );
      }
      throw error;
    }
  }

  private invalid(reference: string, reason: string, registryPath?: string): BindingResult {
    return {
      status: "invalid",
      source: "schema-field",
      reference,
      reason,
      ...(registryPath === undefined ? {} : { registryPath }),
    };
  }
}
