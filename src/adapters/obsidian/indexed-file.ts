/** Waiting boundary for a file created outside Obsidian to enter its indexed file model. */
import { normalizePath, TFile, type Vault } from "obsidian";

export async function waitForIndexedFile(
  vault: Pick<Vault, "getAbstractFileByPath">,
  path: string,
  pause: () => Promise<void> = () =>
    new Promise((resolve) => setTimeout(resolve, 50)),
): Promise<TFile> {
  const normalized = normalizePath(path);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const file = vault.getAbstractFileByPath(normalized);
    if (file instanceof TFile) return file;
    await pause();
  }
  throw new Error(
    `the generated file ${normalized} did not enter the Obsidian file index`,
  );
}
