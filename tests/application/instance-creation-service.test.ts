import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  InstanceCreationService,
  RegistryReader,
  type InstanceStore,
} from "../../src/application";
import { FileSchemaLoader, YamlDocumentParser } from "../../src/infrastructure";
import type { JsonObject } from "../../src/domain";
import { MemoryFileSource } from "../support/fixture-vault";

const files = new MemoryFileSource({
  "schemas.yml": [
    "schemas:",
    "  project:record@1: record.schema.yaml",
    "  project:view@1: view.schema.yaml",
    "",
  ].join("\n"),
  "record.schema.yaml": [
    "title: Research record",
    "type: object",
    "required: [_schema, id]",
    "properties:",
    "  _schema: { const: 'project:record@1' }",
    "  id: { type: [string, 'null'] }",
    "  note: { type: string }",
    "",
  ].join("\n"),
  "view.schema.yaml": [
    "title: Derived view",
    "readOnly: true",
    "properties:",
    "  _schema: { const: 'project:view@1' }",
    "",
  ].join("\n"),
});

class MemoryInstanceStore implements InstanceStore {
  readonly created = new Map<string, JsonObject>();

  exists(path: string): Promise<boolean> {
    return Promise.resolve(this.created.has(path));
  }

  create(path: string, value: JsonObject): Promise<void> {
    this.created.set(path, value);
    return Promise.resolve();
  }
}

function service(
  store = new MemoryInstanceStore(),
): [InstanceCreationService, MemoryInstanceStore] {
  const settings = { ...DEFAULT_SETTINGS, schemaRegistry: "schemas.yml" };
  const parser = new YamlDocumentParser();
  const registry = new RegistryReader(parser, files, () => settings);
  return [
    new InstanceCreationService(registry, new FileSchemaLoader(files, registry), store),
    store,
  ];
}

describe("InstanceCreationService", () => {
  it("lists writable registered contracts and creates a bound skeleton", async () => {
    const [creation, store] = service();

    await expect(creation.availableSchemas()).resolves.toEqual([
      {
        identifier: "project:record@1",
        schemaPath: "record.schema.yaml",
        title: "Research record",
      },
    ]);
    await expect(creation.create("project:record@1", "research/new.yml")).resolves.toEqual({
      path: "research/new.yml",
      identifier: "project:record@1",
    });
    expect(store.created.get("research/new.yml")).toEqual({
      _schema: "project:record@1",
      id: null,
    });
  });

  it.each(["", "../outside.yml", "/absolute.yml", "record.md"])(
    "rejects the unsafe instance path %j",
    async (path) => {
      const [creation] = service();
      await expect(creation.create("project:record@1", path)).rejects.toThrow();
    },
  );

  it("refuses to overwrite an existing file", async () => {
    const [creation, store] = service();
    store.created.set("record.yml", {});

    await expect(creation.create("project:record@1", "record.yml")).rejects.toThrow(
      "already exists",
    );
  });
});
