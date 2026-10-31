/** Resolves schema bindings, loading a configured logical-identifier registry when required. */
import { readSchemaField, resolveBinding, type BindingResult } from "../domain";
import type { BindingResolver, DocumentParser, FileSource } from "./protocols";
import { RegistryReader } from "./registry-reader";
import type { EkphrasisSettings } from "./settings";

export class BindingService implements BindingResolver {
  private readonly registry: RegistryReader;

  constructor(
    parser: DocumentParser,
    files: FileSource,
    private readonly settings: () => EkphrasisSettings,
  ) {
    this.registry = new RegistryReader(parser, files, settings);
  }

  async resolve(path: string, text: string): Promise<BindingResult> {
    const rules = this.settings().pathRules;
    const identifier = readSchemaField(text);
    if (identifier === null) return resolveBinding(path, text, rules);
    const state = await this.registry.read();
    if (state.status === "unconfigured") return resolveBinding(path, text, rules);
    if (state.status === "invalid") {
      return {
        status: "invalid",
        source: "schema-field",
        reference: identifier,
        reason: state.reason,
        ...(state.path === undefined ? {} : { registryPath: state.path }),
      };
    }
    return resolveBinding(path, text, rules, state.registry.schemas, state.path);
  }
}
