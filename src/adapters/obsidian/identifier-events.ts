/**
 * Routing of the changes of the vault to the index of record identifiers.
 *
 * A YAML file is indexed at its creation and at each change, moved at its rename and forgotten at
 * its deletion. Every changed path is also reported as a possible schema file, so that the files
 * bound to that schema are indexed again. A change of a folder, whose files Obsidian may not
 * report one by one, rebuilds the index.
 *
 * The module calls no API of Obsidian, so its routing is tested outside the host; the module
 * `identifier-watcher` translates the events of the vault into the changes below.
 */
import type { IdentifierIndexService } from "../../application";
import { extensionOf } from "../../domain";
import { isYamlExtension } from "./constants";

/** Change of one file or folder of the vault, as the events of the vault report it. */
export type VaultChange =
  | {
      readonly kind: "create" | "modify" | "delete";
      readonly path: string;
      readonly folder: boolean;
    }
  | {
      readonly kind: "rename";
      readonly path: string;
      readonly oldPath: string;
      readonly folder: boolean;
    };

/** Methods of the index service that the changes of the vault call. */
export type IdentifierIndexUpdates = Pick<
  IdentifierIndexService,
  "rebuild" | "indexFile" | "removeFile" | "renameFile" | "dependencyChanged"
>;

/** Whether the file at `path` is a YAML file, and so possibly a record. */
export const isYamlPath = (path: string): boolean => isYamlExtension(extensionOf(path));

/**
 * Applies `change` to the index. A folder change rebuilds the index from `yamlPaths`, the paths of
 * the YAML files of the vault after the change.
 */
export async function applyVaultChange(
  index: IdentifierIndexUpdates,
  change: VaultChange,
  yamlPaths: () => readonly string[],
): Promise<void> {
  if (change.folder) {
    await index.rebuild(yamlPaths());
    return;
  }
  const { path } = change;
  switch (change.kind) {
    case "create":
    case "modify":
      if (isYamlPath(path)) await index.indexFile(path);
      break;
    case "delete":
      index.removeFile(path);
      break;
    case "rename":
      if (isYamlPath(path)) await index.renameFile(change.oldPath, path);
      else index.removeFile(change.oldPath);
      await index.dependencyChanged(change.oldPath);
      break;
  }
  await index.dependencyChanged(path);
}
