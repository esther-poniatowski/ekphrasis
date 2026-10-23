/**
 * Maintenance of the index of record identifiers from the events of the vault of Obsidian.
 *
 * Obsidian reports every file of the vault as created while it loads the vault, so the index is
 * built once the layout is ready, and the events are followed from then on.
 */
import { TFile, type Plugin, type TAbstractFile } from "obsidian";
import type { IdentifierIndexService } from "../../application";
import { applyVaultChange, isYamlPath, type VaultChange } from "./identifier-events";

/** Vault paths of the YAML files of the vault of `plugin`. */
function yamlPathsOf(plugin: Plugin): string[] {
  return plugin.app.vault
    .getFiles()
    .map((file) => file.path)
    .filter(isYamlPath);
}

const reportFailure = (error: unknown): void => {
  console.error("ekphrasis: the index of record identifiers failed to update.", error);
};

/**
 * Builds the index of `index` once the layout is ready, then follows the changes of the vault.
 * Returns a promise settled once the first build is complete, whether it succeeded or failed.
 */
export function watchRecordIdentifiers(
  plugin: Plugin,
  index: IdentifierIndexService,
): Promise<void> {
  const { vault, workspace } = plugin.app;
  const apply = (change: VaultChange): void => {
    applyVaultChange(index, change, () => yamlPathsOf(plugin)).catch(reportFailure);
  };
  const changeOf = (kind: "create" | "modify" | "delete", file: TAbstractFile): VaultChange => ({
    kind,
    path: file.path,
    folder: !(file instanceof TFile),
  });

  return new Promise((resolve) => {
    workspace.onLayoutReady(() => {
      rebuildRecordIdentifiers(plugin, index).catch(reportFailure).finally(resolve);
      plugin.registerEvent(vault.on("create", (file) => apply(changeOf("create", file))));
      plugin.registerEvent(vault.on("modify", (file) => apply(changeOf("modify", file))));
      plugin.registerEvent(vault.on("delete", (file) => apply(changeOf("delete", file))));
      plugin.registerEvent(
        vault.on("rename", (file, oldPath) =>
          apply({ kind: "rename", path: file.path, oldPath, folder: !(file instanceof TFile) }),
        ),
      );
    });
  });
}

/** Rebuilds the index of `index` from every YAML file, as after a change of the path rules. */
export async function rebuildRecordIdentifiers(
  plugin: Plugin,
  index: IdentifierIndexService,
): Promise<void> {
  await index.rebuild(yamlPathsOf(plugin));
}

/** Rebuilds the index of `index`, and reports a failure in the console. */
export function rebuildRecordIdentifiersSoon(plugin: Plugin, index: IdentifierIndexService): void {
  rebuildRecordIdentifiers(plugin, index).catch(reportFailure);
}
