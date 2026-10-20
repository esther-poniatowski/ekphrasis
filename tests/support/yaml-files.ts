/**
 * Discovery of YAML files for tests: the synthetic fixtures, and the optional corpus of records
 * of the consumer projects.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Folder of the synthetic fixtures reproducing the constructs of the consumer projects. The path is
 * joined rather than resolved as a URL, since a simulated DOM replaces the class `URL`.
 */
export const FIXTURES_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

/**
 * Environment variable naming the folder of the corpus. The corpus holds records of the consumer
 * projects, which never enter this public repository.
 */
export const CORPUS_VARIABLE = "EKPHRASIS_CORPUS";

/** A YAML file read for a test, named by its path relative to the folder searched. */
export interface YamlFile {
  readonly name: string;
  readonly text: string;
}

const YAML_FILE = /\.ya?ml$/;
const SKIPPED_FOLDERS = new Set([".git", "node_modules", ".obsidian"]);

/** Reads every YAML file under `root`, recursively, in a stable order. */
export function readYamlFiles(root: string): readonly YamlFile[] {
  const walk = (folder: string): string[] =>
    readdirSync(folder, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((entry) => {
        const path = join(folder, entry.name);
        if (entry.isDirectory()) return SKIPPED_FOLDERS.has(entry.name) ? [] : walk(path);
        return YAML_FILE.test(entry.name) ? [path] : [];
      });
  return walk(root).map((path) => ({
    name: relative(root, path),
    text: readFileSync(path, "utf8"),
  }));
}
