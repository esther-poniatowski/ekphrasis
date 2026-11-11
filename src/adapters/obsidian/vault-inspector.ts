/**
 * Implementation of the port `VaultInspector` over the vault of Obsidian: the indexed file model
 * that a save of a form requires, the low-level adapter for the files that Obsidian does not
 * index, and the write permission of a file on the desktop file system.
 *
 * The desktop adapter saves a file by writing it in place, so the write permission of the file
 * decides whether a save succeeds; the inspector asks the operating system for it without
 * writing. The mobile adapter exposes no permission, so the inspector reports it as unknown.
 */
import { FileSystemAdapter, normalizePath, TFile, TFolder, type Vault } from "obsidian";
import type { VaultInspector, WriteAccess } from "../../application";

export class ObsidianVaultInspector implements VaultInspector {
  constructor(
    private readonly vault: Vault,
    /** Write permission of a file at an absolute path of the file system. */
    private readonly writeAccessOf: (absolutePath: string) => Promise<WriteAccess>,
  ) {}

  isIndexedFile(path: string): boolean {
    return this.vault.getAbstractFileByPath(normalizePath(path)) instanceof TFile;
  }

  isIndexedFolder(path: string): boolean {
    return this.vault.getAbstractFileByPath(normalizePath(path)) instanceof TFolder;
  }

  exists(path: string): Promise<boolean> {
    return this.vault.adapter.exists(normalizePath(path));
  }

  async modifiedAt(path: string): Promise<number | null> {
    return (await this.vault.adapter.stat(normalizePath(path)))?.mtime ?? null;
  }

  writeAccess(path: string): Promise<WriteAccess> {
    const adapter = this.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) {
      return Promise.resolve({
        status: "unknown",
        reason: "this device exposes no file permission to plugins",
      });
    }
    return this.writeAccessOf(adapter.getFullPath(normalizePath(path)));
  }
}
