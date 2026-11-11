/** Obsidian persistence of newly created YAML instances. */
import { normalizePath, type Vault } from "obsidian";
import { stringify } from "yaml";
import type { InstanceStore } from "../../application";
import type { JsonObject } from "../../domain";

export class VaultInstanceStore implements InstanceStore {
  constructor(private readonly vault: Vault) {}

  exists(path: string): Promise<boolean> {
    return Promise.resolve(this.vault.getAbstractFileByPath(normalizePath(path)) !== null);
  }

  async create(path: string, value: JsonObject): Promise<void> {
    await this.vault.create(normalizePath(path), stringify(value, { lineWidth: 0 }));
  }
}
