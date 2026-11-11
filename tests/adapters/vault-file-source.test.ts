import { TFile, type Vault } from "obsidian";
import { describe, expect, it, vi } from "vitest";
import { VaultFileSource } from "../../src/adapters/obsidian/vault-file-source";

function vaultWith(options: { indexed?: TFile; adapterExists?: boolean; text: string }): {
  vault: Vault;
  cachedRead: ReturnType<typeof vi.fn>;
  adapterExists: ReturnType<typeof vi.fn>;
  adapterRead: ReturnType<typeof vi.fn>;
} {
  const cachedRead = vi.fn().mockResolvedValue(options.text);
  const adapterExists = vi.fn().mockResolvedValue(options.adapterExists ?? false);
  const adapterRead = vi.fn().mockResolvedValue(options.text);
  const vault = {
    getAbstractFileByPath: vi.fn().mockReturnValue(options.indexed ?? null),
    cachedRead,
    adapter: {
      exists: adapterExists,
      read: adapterRead,
    },
  } as unknown as Vault;
  return { vault, cachedRead, adapterExists, adapterRead };
}

describe("reading text from the Obsidian vault", () => {
  it("uses the indexed file when Obsidian exposes it", async () => {
    const indexed = new TFile();
    const { vault, cachedRead, adapterExists, adapterRead } = vaultWith({
      indexed,
      text: "indexed",
    });

    await expect(new VaultFileSource(vault).read("records/project.yml")).resolves.toBe("indexed");
    expect(cachedRead).toHaveBeenCalledWith(indexed);
    expect(adapterExists).not.toHaveBeenCalled();
    expect(adapterRead).not.toHaveBeenCalled();
  });

  it("reads a generated schema omitted from the indexed file model", async () => {
    const { vault, adapterRead } = vaultWith({ adapterExists: true, text: "schema" });

    await expect(
      new VaultFileSource(vault).readSchema(
        ".kleisis/resources/geonexus/project.schema.yaml",
        true,
      ),
    ).resolves.toBe("schema");
    expect(adapterRead).toHaveBeenCalledWith(".kleisis/resources/geonexus/project.schema.yaml");
  });

  it("reads exact admitted paths in a child project's hidden resources", async () => {
    const { vault, adapterRead } = vaultWith({ adapterExists: true, text: "schema" });
    const files = new VaultFileSource(vault);

    await expect(
      files.readSchema("projects/child/.kleisis/resources/tool/base.schema.yaml", true),
    ).resolves.toBe("schema");
    expect(adapterRead).toHaveBeenCalledTimes(1);
  });

  it.each([
    ".git/config",
    ".obsidian/plugins/data.json",
    "projects/child/.git/config",
    "projects/child/.obsidian/plugins/data.json",
    "../outside.yaml",
  ])("does not use the adapter for another hidden path: %s", async (path) => {
    const { vault, adapterExists, adapterRead } = vaultWith({
      adapterExists: true,
      text: "private",
    });

    await expect(new VaultFileSource(vault).readSchema(path, true)).resolves.toBeNull();
    expect(adapterExists).not.toHaveBeenCalled();
    expect(adapterRead).not.toHaveBeenCalled();
  });

  it("refuses a hidden file outside the admitted closure", async () => {
    const { vault, adapterExists } = vaultWith({ adapterExists: true, text: "private" });

    await expect(
      new VaultFileSource(vault).readSchema(".private/secret.yaml", false),
    ).resolves.toBeNull();
    expect(adapterExists).not.toHaveBeenCalled();
  });

  it("returns null when a generated schema does not exist", async () => {
    const { vault, adapterRead } = vaultWith({ text: "unused" });

    await expect(
      new VaultFileSource(vault).readSchema(
        ".kleisis/resources/geonexus/missing.schema.yaml",
        true,
      ),
    ).resolves.toBeNull();
    expect(adapterRead).not.toHaveBeenCalled();
  });
});
