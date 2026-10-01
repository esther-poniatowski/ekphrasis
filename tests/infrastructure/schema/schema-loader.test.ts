import { describe, expect, it } from "vitest";
import { SchemaView } from "../../../src/domain";
import { SchemaLoadError, SchemaReferenceError } from "../../../src/errors";
import { FileSchemaLoader } from "../../../src/infrastructure";
import { FIXTURES_ROOT } from "../../support/yaml-files";
import { DirectoryFileSource, MemoryFileSource } from "../../support/fixture-vault";

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
    await expect(loading).rejects.toThrow('"missing.json", referenced from "a.json",');
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
});
