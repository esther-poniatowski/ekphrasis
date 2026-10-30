/**
 * Implementation of the `FileSource` port over the vault of Obsidian.
 */
import { normalizePath, TFile, type Vault } from "obsidian";
import type { FileSource } from "../../application";

const GENERATED_SCHEMA_ROOT = ".schema-resources";

function isGeneratedSchemaResourcePath(path: string): boolean {
  const [root, ...segments] = path.split("/");
  return (
    root === GENERATED_SCHEMA_ROOT &&
    segments.length > 0 &&
    segments.every((segment) => segment !== "" && segment !== "." && segment !== "..")
  );
}

export class VaultFileSource implements FileSource {
  constructor(private readonly vault: Vault) {}

  async read(path: string): Promise<string | null> {
    const normalizedPath = normalizePath(path);
    const file = this.vault.getAbstractFileByPath(normalizedPath);
    if (file instanceof TFile) return this.vault.cachedRead(file);

    if (!isGeneratedSchemaResourcePath(normalizedPath)) return null;
    return (await this.vault.adapter.exists(normalizedPath))
      ? this.vault.adapter.read(normalizedPath)
      : null;
  }
}
