/**
 * Implementation of the `FileSource` port over the vault of Obsidian.
 */
import { normalizePath, TFile, type Vault } from "obsidian";
import type { FileSource } from "../../application";

function isGeneratedSchemaResourcePath(path: string, configuredRoot: string): boolean {
  const root = normalizePath(configuredRoot).replace(/\/$/, "");
  if (root === "" || path === root || !path.startsWith(`${root}/`)) return false;
  const segments = path.slice(root.length + 1).split("/");
  return (
    segments.length > 0 &&
    segments.every((segment) => segment !== "" && segment !== "." && segment !== "..")
  );
}

export class VaultFileSource implements FileSource {
  constructor(
    private readonly vault: Vault,
    private readonly schemaResourceRoot: () => string = () => ".schema-resources",
  ) {}

  async read(path: string): Promise<string | null> {
    const normalizedPath = normalizePath(path);
    const file = this.vault.getAbstractFileByPath(normalizedPath);
    if (file instanceof TFile) return this.vault.cachedRead(file);

    if (!isGeneratedSchemaResourcePath(normalizedPath, this.schemaResourceRoot())) return null;
    return (await this.vault.adapter.exists(normalizedPath))
      ? this.vault.adapter.read(normalizedPath)
      : null;
  }
}
