import { FileSystemAdapter, TFile, TFolder, type Vault } from "obsidian";
import { describe, expect, it, vi } from "vitest";
import { ObsidianVaultInspector } from "../../src/adapters/obsidian/vault-inspector";

function vaultWith(entries: Record<string, unknown>, adapter: object): Vault {
  return {
    getAbstractFileByPath: (path: string) => entries[path] ?? null,
    adapter,
  } as unknown as Vault;
}

/** Desktop adapter of the mock, whose constructor takes the folder of the vault. */
function desktopAdapter(basePath: string): FileSystemAdapter {
  const Adapter = FileSystemAdapter as unknown as new (base: string) => FileSystemAdapter;
  return new Adapter(basePath);
}

describe("the vault inspector of the setup diagnostic", () => {
  it("distinguishes indexed files and folders from paths that Obsidian does not index", () => {
    const inspector = new ObsidianVaultInspector(
      vaultWith({ "notes/a.yml": new TFile(), notes: new TFolder() }, {}),
      vi.fn(),
    );
    expect(inspector.isIndexedFile("notes/a.yml")).toBe(true);
    expect(inspector.isIndexedFile(".schema-resources/a.yml")).toBe(false);
    expect(inspector.isIndexedFolder("notes")).toBe(true);
    expect(inspector.isIndexedFolder(".schema-resources")).toBe(false);
  });

  it("asks the file system for the write permission of the absolute path of a desktop vault", async () => {
    const access = vi.fn().mockResolvedValue({ status: "denied", reason: "EACCES" });
    const inspector = new ObsidianVaultInspector(vaultWith({}, desktopAdapter("/vault")), access);
    await expect(inspector.writeAccess("notes/a.yml")).resolves.toEqual({
      status: "denied",
      reason: "EACCES",
    });
    expect(access).toHaveBeenCalledWith("/vault/notes/a.yml");
  });

  it("reports the permission as unknown where the adapter exposes none", async () => {
    const access = vi.fn();
    const inspector = new ObsidianVaultInspector(vaultWith({}, {}), access);
    await expect(inspector.writeAccess("notes/a.yml")).resolves.toMatchObject({
      status: "unknown",
    });
    expect(access).not.toHaveBeenCalled();
  });
});
