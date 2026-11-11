/**
 * A folder on disk read as a vault by the setup diagnostic: a path with a hidden segment, such as
 * `.schema-resources/a.yaml`, is not indexed, as Obsidian omits it; the file source reads such a
 * path only below the schema resource directory, as the vault file source of the plugin does; and
 * the write permission is asked of the file system.
 */
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { EkphrasisSettings, FileSource, VaultInspector } from "../../src/application";
import { writeAccessOf } from "../../src/infrastructure";

/** Whether Obsidian would index `path`: no segment of it is hidden. */
function indexed(path: string): boolean {
  return !path.split("/").some((part) => part.startsWith("."));
}

export function diskVault(
  root: string,
  settings: () => EkphrasisSettings,
): { readonly files: FileSource; readonly inspector: VaultInspector } {
  const stats = (path: string) => {
    try {
      return statSync(join(root, path));
    } catch {
      return null;
    }
  };
  const files: FileSource = {
    read: (path) => {
      const admitted = indexed(path) || path.startsWith(`${settings().schemaResourceRoot}/`);
      if (!admitted || stats(path)?.isFile() !== true) return Promise.resolve(null);
      return Promise.resolve(readFileSync(join(root, path), "utf8"));
    },
  };
  const inspector: VaultInspector = {
    isIndexedFile: (path) => indexed(path) && stats(path)?.isFile() === true,
    isIndexedFolder: (path) => indexed(path) && stats(path)?.isDirectory() === true,
    exists: (path) => Promise.resolve(stats(path) !== null),
    modifiedAt: (path) => Promise.resolve(stats(path)?.mtimeMs ?? null),
    writeAccess: (path) => writeAccessOf(join(root, path)),
  };
  return { files, inspector };
}
