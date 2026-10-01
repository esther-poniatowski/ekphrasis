/**
 * Implementation of the `FileSource` port over the vault of Obsidian.
 */
import { normalizePath, TFile, type Vault } from "obsidian";
import type { FileSource } from "../../application";

export class VaultFileSource implements FileSource {
  constructor(private readonly vault: Vault) {}

  async read(path: string): Promise<string | null> {
    const file = this.vault.getAbstractFileByPath(normalizePath(path));
    return file instanceof TFile ? this.vault.cachedRead(file) : null;
  }
}
