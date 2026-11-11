import { TFile, type Vault } from "obsidian";
import { describe, expect, it } from "vitest";
import { waitForIndexedFile } from "../../src/adapters/obsidian/indexed-file";

describe("the generated file entering the Obsidian index", () => {
  it("waits for a file created outside Obsidian before the view opens", async () => {
    const file = new TFile();
    let calls = 0;
    const vault = {
      getAbstractFileByPath: () => {
        calls += 1;
        return calls >= 3 ? file : null;
      },
    } as Pick<Vault, "getAbstractFileByPath">;

    await expect(
      waitForIndexedFile(vault, "views/exposure.yml", () => Promise.resolve()),
    ).resolves.toBe(file);
    expect(calls).toBe(3);
  });

  it("reports a generated path that never enters the file index", async () => {
    const vault = {
      getAbstractFileByPath: () => null,
    } as Pick<Vault, "getAbstractFileByPath">;

    await expect(
      waitForIndexedFile(vault, "views/missing.yml", () => Promise.resolve()),
    ).rejects.toThrow("did not enter the Obsidian file index");
  });
});
