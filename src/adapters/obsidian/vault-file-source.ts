/**
 * Implementation of the `FileSource` port over the vault of Obsidian.
 */
import { normalizePath, TFile, type Vault } from "obsidian";
import type { FileSource } from "../../application";
import { resolveVaultPath } from "../../domain";

function admittedHiddenPath(path: string): string | null {
  const resolved = resolveVaultPath("", path);
  if (resolved === null || resolved === "") return null;
  const protectedDirectory = resolved
    .split("/")
    .some((segment) => segment === ".git" || segment === ".obsidian");
  return protectedDirectory ? null : normalizePath(resolved);
}

export class VaultFileSource implements FileSource {
  constructor(private readonly vault: Vault) {}

  async read(path: string): Promise<string | null> {
    const normalizedPath = normalizePath(path);
    const file = this.vault.getAbstractFileByPath(normalizedPath);
    if (file instanceof TFile) return this.vault.cachedRead(file);

    return null;
  }

  async readSchema(path: string, admitted: boolean): Promise<string | null> {
    const normalizedPath = admittedHiddenPath(path);
    if (normalizedPath === null) return null;
    const indexed = await this.read(normalizedPath);
    if (indexed !== null) return indexed;
    if (!admitted) return null;
    return (await this.vault.adapter.exists(normalizedPath))
      ? this.vault.adapter.read(normalizedPath)
      : null;
  }
}
