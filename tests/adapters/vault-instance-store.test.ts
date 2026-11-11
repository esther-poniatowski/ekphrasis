import { describe, expect, it, vi } from "vitest";
import type { Vault } from "obsidian";
import { VaultInstanceStore } from "../../src/adapters/obsidian/vault-instance-store";

describe("VaultInstanceStore", () => {
  it("detects an existing path and serializes a new mapping as YAML", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const vault = {
      getAbstractFileByPath: (path: string) => (path === "known.yml" ? {} : null),
      create,
    } as unknown as Vault;
    const store = new VaultInstanceStore(vault);

    await expect(store.exists("known.yml")).resolves.toBe(true);
    await expect(store.exists("new.yml")).resolves.toBe(false);
    await store.create("new.yml", { _schema: "project:record@1", id: null });

    expect(create).toHaveBeenCalledWith("new.yml", "_schema: project:record@1\nid: null\n");
  });
});
