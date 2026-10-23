import { describe, expect, it } from "vitest";
import {
  applyVaultChange,
  type IdentifierIndexUpdates,
  type VaultChange,
} from "../../src/adapters/obsidian/identifier-events";

/** Index recording each call, in order. */
function recorder(): { index: IdentifierIndexUpdates; calls: string[] } {
  const calls: string[] = [];
  const index: IdentifierIndexUpdates = {
    rebuild: (paths) => {
      calls.push(`rebuild ${paths.join(",")}`);
      return Promise.resolve();
    },
    indexFile: (path) => {
      calls.push(`index ${path}`);
      return Promise.resolve();
    },
    removeFile: (path) => {
      calls.push(`remove ${path}`);
    },
    renameFile: (oldPath, newPath) => {
      calls.push(`rename ${oldPath} ${newPath}`);
      return Promise.resolve();
    },
    dependencyChanged: (path) => {
      calls.push(`dependency ${path}`);
      return Promise.resolve();
    },
  };
  return { index, calls };
}

async function route(change: VaultChange): Promise<string[]> {
  const { index, calls } = recorder();
  await applyVaultChange(index, change, () => ["a.yml", "b.yaml"]);
  return calls;
}

describe("routing of the changes of the vault to the index of identifiers", () => {
  it("indexes a created or changed YAML file, then reports it as a possible schema", async () => {
    expect(await route({ kind: "create", path: "q/a.yml", folder: false })).toEqual([
      "index q/a.yml",
      "dependency q/a.yml",
    ]);
    expect(await route({ kind: "modify", path: "s/r.schema.yaml", folder: false })).toEqual([
      "index s/r.schema.yaml",
      "dependency s/r.schema.yaml",
    ]);
  });

  it("reports a changed JSON schema as a possible schema only", async () => {
    expect(await route({ kind: "modify", path: "s/r.schema.json", folder: false })).toEqual([
      "dependency s/r.schema.json",
    ]);
  });

  it("forgets a deleted file", async () => {
    expect(await route({ kind: "delete", path: "q/a.yml", folder: false })).toEqual([
      "remove q/a.yml",
      "dependency q/a.yml",
    ]);
  });

  it("moves a renamed YAML file, and forgets a file renamed to another extension", async () => {
    expect(
      await route({ kind: "rename", path: "q/b.yml", oldPath: "q/a.yml", folder: false }),
    ).toEqual(["rename q/a.yml q/b.yml", "dependency q/a.yml", "dependency q/b.yml"]);
    expect(
      await route({ kind: "rename", path: "q/a.md", oldPath: "q/a.yml", folder: false }),
    ).toEqual(["remove q/a.yml", "dependency q/a.yml", "dependency q/a.md"]);
  });

  it("rebuilds the index after a change of a folder", async () => {
    expect(await route({ kind: "rename", path: "new", oldPath: "old", folder: true })).toEqual([
      "rebuild a.yml,b.yaml",
    ]);
    expect(await route({ kind: "delete", path: "old", folder: true })).toEqual([
      "rebuild a.yml,b.yaml",
    ]);
  });
});
