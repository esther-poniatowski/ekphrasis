/**
 * The fixtures folder read as a vault: a file source over a folder, the path rules binding the
 * fixture records without a modeline, and the binding expected of each fixture.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FileSource } from "../../src/application";
import type { BindingSource, PathRule } from "../../src/domain";

/** Reads the files of a folder, as the vault adapter reads the files of a vault. */
export class DirectoryFileSource implements FileSource {
  constructor(private readonly root: string) {}

  async read(path: string): Promise<string | null> {
    try {
      return await readFile(join(this.root, path), "utf8");
    } catch {
      return null;
    }
  }
}

/** Reads files from an in-memory map of vault paths to texts. */
export class MemoryFileSource implements FileSource {
  readonly reads: string[] = [];

  constructor(private readonly files: Readonly<Record<string, string>>) {}

  read(path: string): Promise<string | null> {
    this.reads.push(path);
    return Promise.resolve(this.files[path] ?? null);
  }
}

/** Path rules of the fixtures, mirroring the binding by patterns of geonexus. */
export const FIXTURE_RULES: readonly PathRule[] = [
  { pattern: "gnomon/question.yml", schema: "gnomon/schemas/question.schema.yaml" },
  { pattern: "**/{glossary,*.glossary}.yml", schema: "geonexus/schemas/glossary.schema.yaml" },
  { pattern: "constructs/anchors.yml", schema: "constructs/schemas/anchors.schema.yaml" },
  {
    pattern: "constructs/block-scalars.yml",
    schema: "constructs/schemas/block-scalars.schema.yaml",
  },
];

/** Source expected to bind each fixture record; every other fixture is unbound. */
export const FIXTURE_BINDINGS: Readonly<Record<string, BindingSource>> = {
  "gnomon/question.yml": "path-rule",
  "gnomon/target-system.yml": "modeline",
  "geonexus/glossary.yml": "path-rule",
  "constructs/anchors.yml": "path-rule",
  "constructs/block-scalars.yml": "path-rule",
};
