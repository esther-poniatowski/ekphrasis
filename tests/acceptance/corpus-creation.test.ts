/**
 * Optional acceptance test of record creation against the configured Gnomon registry. The corpus
 * is read but never modified: the created value remains in memory and is opened through an
 * overlay file source.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stringify } from "yaml";
import {
  DEFAULT_SETTINGS,
  FormService,
  InstanceCreationService,
  RegistryReader,
  type FileSource,
  type InstanceStore,
} from "../../src/application";
import type { JsonObject } from "../../src/domain";
import { FileSchemaLoader, YamlDocumentParser } from "../../src/infrastructure";
import { DirectoryFileSource } from "../support/fixture-vault";
import { createValidation } from "../support/validation";
import { CORPUS_VARIABLE } from "../support/yaml-files";

const REGISTRY = "specs/schema-registry.yml";
const corpusRoot = process.env[CORPUS_VARIABLE];
const hasRegistry = corpusRoot !== undefined && existsSync(join(corpusRoot, REGISTRY));

class MemoryStore implements InstanceStore {
  value: JsonObject | null = null;

  exists(): Promise<boolean> {
    return Promise.resolve(false);
  }

  create(_path: string, value: JsonObject): Promise<void> {
    this.value = value;
    return Promise.resolve();
  }
}

describe.skipIf(!hasRegistry)(`record creation from ${CORPUS_VARIABLE}`, () => {
  it("creates a current Gnomon question and opens its form without changing the corpus", async () => {
    const directory = new DirectoryFileSource(corpusRoot ?? "");
    const parser = new YamlDocumentParser();
    const settings = { ...DEFAULT_SETTINGS, schemaRegistry: REGISTRY };
    const registry = new RegistryReader(parser, directory, () => settings);
    const loader = new FileSchemaLoader(directory, registry);
    const store = new MemoryStore();
    const creation = new InstanceCreationService(registry, loader, store);

    const schemas = await creation.availableSchemas();
    expect(schemas.some(({ identifier }) => identifier === "gnomon:question@3")).toBe(true);
    expect(schemas.some(({ identifier }) => identifier.startsWith("gnomon:view."))).toBe(false);
    await creation.create("gnomon:question@3", "research/new-question.yml");
    expect(store.value).not.toBeNull();

    const created = stringify(store.value, { lineWidth: 0 });
    const files: FileSource = {
      read: (path) =>
        path === "research/new-question.yml" ? Promise.resolve(created) : directory.read(path),
    };
    const forms = new FormService(
      parser,
      new FileSchemaLoader(files, registry),
      createValidation(),
      () => settings,
      files,
    );
    const state = await forms.open("research/new-question.yml", created);

    expect(state).toMatchObject({
      status: "form",
      binding: { source: "schema-field" },
    });
    if (state.status !== "form" || state.model.root.kind !== "group" || store.value === null) {
      return;
    }
    const initialKeys = Object.keys(store.value).filter((key) => key !== "_schema");
    const initiallyDisplayed = state.model.root.children
      .filter((field) => field.required || field.node !== null)
      .map((field) => field.key);
    expect(initiallyDisplayed).toEqual(initialKeys);
    expect(state.model.root.children.length).toBeGreaterThan(initiallyDisplayed.length);
  });
});
