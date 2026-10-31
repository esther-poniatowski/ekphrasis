import { describe, expect, it } from "vitest";
import { SchemaView } from "../../../src/domain";
import { SchemaLoadError, SchemaReferenceError } from "../../../src/errors";
import { FileSchemaLoader } from "../../../src/infrastructure";
import { FIXTURES_ROOT } from "../../support/yaml-files";
import { DirectoryFileSource, MemoryFileSource } from "../../support/fixture-vault";
import {
  BASE_PATH,
  BASE_URI,
  COMMON_PATH,
  COMPOSED_SETTINGS,
  COMPOSED_VAULT,
  composedLoader,
  REGISTRY_PATH,
  ROOT_PATH,
} from "../../support/composed-vault";
import { DEFAULT_SETTINGS } from "../../../src/application";

describe("FileSchemaLoader", () => {
  it("loads a YAML schema with the files that its references reach", async () => {
    const loader = new FileSchemaLoader(new DirectoryFileSource(FIXTURES_ROOT));
    const set = await loader.load("geonexus/schemas/glossary.schema.yaml");

    expect(set.paths).toEqual([
      "geonexus/schemas/glossary.schema.yaml",
      "geonexus/schemas/common.schema.yaml",
    ]);
    const id = SchemaView.root(set)
      .properties()
      .find(({ key }) => key === "id");
    expect(id?.schema.description).toMatch(/kebab-case/);
  });

  it("parses a .json file as JSON, and reads each file once", async () => {
    const files = new MemoryFileSource({
      "s/a.schema.json":
        '{"properties": {"x": {"$ref": "b.schema.json"}, "y": {"$ref": "b.schema.json#/$defs/y"}}}',
      "s/b.schema.json": '{"title": "B", "$defs": {"y": {"type": "number"}}}',
    });
    const set = await new FileSchemaLoader(files).load("s/a.schema.json");

    expect(SchemaView.root(set).properties()[0]?.schema.title).toBe("B");
    expect(files.reads).toEqual(["s/a.schema.json", "s/b.schema.json"]);
  });

  it("reports a missing referenced file with its referrer", async () => {
    const files = new MemoryFileSource({ "a.json": '{"$ref": "missing.json"}' });
    const loading = new FileSchemaLoader(files).load("a.json");

    await expect(loading).rejects.toThrow(SchemaLoadError);
    await expect(loading).rejects.toThrow("`missing.json`, referenced from `a.json`,");
  });

  it("reports malformed JSON and YAML", async () => {
    const files = new MemoryFileSource({ "a.json": "{", "b.yaml": "a: [1\n" });
    const loader = new FileSchemaLoader(files);

    await expect(loader.load("a.json")).rejects.toThrow(/not valid JSON/);
    await expect(loader.load("b.yaml")).rejects.toThrow(/not valid YAML/);
  });

  it("reports a reference to an absent definition", async () => {
    const files = new MemoryFileSource({ "a.yaml": "$ref: '#/$defs/none'\n" });

    await expect(new FileSchemaLoader(files).load("a.yaml")).rejects.toThrow(SchemaReferenceError);
  });

  describe("absolute references", () => {
    const registry = (resources: string): string =>
      `schema_version: 2\nschemas: {}\nresources:\n${resources}`;
    const referring = `allOf:\n  - $ref: '${BASE_URI}#/$defs/x'\n`;

    it("loads the file mapped to an absolute `$id` from another folder, with its closure", async () => {
      const files = new MemoryFileSource(COMPOSED_VAULT);
      const set = await composedLoader(files).load(ROOT_PATH);

      expect(set.paths).toEqual([ROOT_PATH, BASE_PATH, COMMON_PATH]);
      expect(set.dependencies).toEqual([ROOT_PATH, BASE_PATH, COMMON_PATH, REGISTRY_PATH]);
      expect(set.documentPath(BASE_URI)).toBe(BASE_PATH);
      expect(files.reads.some((path) => path.includes("://"))).toBe(false);
    });

    it("reports an absolute URI that the registry does not map, with its referrer", async () => {
      const files = new MemoryFileSource({
        [REGISTRY_PATH]: registry("  'https://example.org/other': other.yaml\n"),
        "root.yaml": referring,
      });
      const loading = composedLoader(files).load("root.yaml");

      await expect(loading).rejects.toThrow(SchemaReferenceError);
      await expect(loading).rejects.toThrow(
        `The absolute URI \`${BASE_URI}\`, referenced from \`root.yaml\`, is mapped by no entry of the resources of the registry \`${REGISTRY_PATH}\``,
      );
      await expect(loading).rejects.toMatchObject({
        schemaPath: "root.yaml",
        dependencies: [REGISTRY_PATH],
      });
    });

    it("maps no URI through a registry of version 1", async () => {
      const files = new MemoryFileSource({
        [REGISTRY_PATH]: "schema_version: 1\nschemas: {}\n",
        "root.yaml": referring,
      });

      await expect(composedLoader(files).load("root.yaml")).rejects.toThrow(
        /is mapped by no entry of the resources/,
      );
    });

    it("names the reason when no registry can be read", async () => {
      const files = new MemoryFileSource({ "root.yaml": referring });

      await expect(composedLoader(files).load("root.yaml")).rejects.toThrow(
        `cannot be resolved, since the registry \`${REGISTRY_PATH}\` is absent`,
      );
      await expect(composedLoader(files, DEFAULT_SETTINGS).load("root.yaml")).rejects.toThrow(
        "cannot be resolved, since no schema registry is configured",
      );
      await expect(new FileSchemaLoader(files).load("root.yaml")).rejects.toThrow(
        "no schema registry is configured",
      );
    });

    it("rejects a mapped path that leaves the vault or names a web address", async () => {
      for (const target of ["../outside.yaml", "https://example.org/copy.yaml"]) {
        const files = new MemoryFileSource({
          [REGISTRY_PATH]: registry(`  '${BASE_URI}': '${target}'\n`),
          "root.yaml": referring,
        });

        await expect(composedLoader(files).load("root.yaml")).rejects.toThrow(
          /to a path outside the vault|to a web address/,
        );
        expect(files.reads).not.toContain(target);
      }
    });

    it("rejects a mapped file whose `$id` differs from the URI, compared as exact strings", async () => {
      const files = new MemoryFileSource({
        [REGISTRY_PATH]: registry(`  '${BASE_URI}': base.yaml\n`),
        "root.yaml": referring,
        "base.yaml": `$id: '${BASE_URI}#'\n$defs: { x: {} }\n`,
      });
      const loading = composedLoader(files).load("root.yaml");

      await expect(loading).rejects.toThrow(SchemaLoadError);
      await expect(loading).rejects.toThrow(
        `maps the absolute URI \`${BASE_URI}\` to \`base.yaml\`, whose \`$id\` is \`${BASE_URI}#\`.`,
      );
    });

    it("resolves without the registry a URI declared by a loaded `$id`", async () => {
      const files = new MemoryFileSource({
        "root.yaml": `properties:\n  a: { $ref: base.yaml }\n  b: { $ref: '${BASE_URI}#/$defs/x' }\n`,
        "base.yaml": `$id: '${BASE_URI}'\n$defs: { x: { title: X } }\n`,
      });
      const set = await new FileSchemaLoader(files).load("root.yaml");

      expect(SchemaView.root(set).properties()[1]?.schema.title).toBe("X");
      expect(set.dependencies).toEqual(["root.yaml", "base.yaml"]);
    });

    it("reads the registry once per load, and only for an unresolved URI", async () => {
      const files = new MemoryFileSource({ ...COMPOSED_VAULT });
      await composedLoader(files, COMPOSED_SETTINGS).load(COMMON_PATH);
      expect(files.reads).not.toContain(REGISTRY_PATH);

      await composedLoader(files).load(ROOT_PATH);
      expect(files.reads.filter((path) => path === REGISTRY_PATH)).toHaveLength(1);
    });
  });
});
