import { describe, expect, it } from "vitest";
import { AjvSchemaValidator, FileSchemaLoader } from "../../../src/infrastructure";
import { SchemaCompileError } from "../../../src/errors";
import { DirectoryFileSource } from "../../support/fixture-vault";
import { schemaSet } from "../../support/schemas";
import { FIXTURES_ROOT } from "../../support/yaml-files";

const validator = new AjvSchemaValidator();

describe("Ajv validator", () => {
  it("compiles the glossary schema of the fixtures, with its references across files and its project keywords", async () => {
    const schemas = await new FileSchemaLoader(new DirectoryFileSource(FIXTURES_ROOT)).load(
      "geonexus/schemas/glossary.schema.yaml",
    );
    const errors = validator.compile(schemas).validate({
      schema_version: 1,
      id: "Not-Kebab",
      terms: {},
      forbidden: {},
    });
    expect(errors.map(({ pointer, keyword }) => [pointer, keyword])).toEqual([["/id", "pattern"]]);
  });

  it("resolves relative references from the folder of the file, whatever the `$id`", () => {
    const schemas = schemaSet({
      "a/root.json": { $id: "https://example.org/x/root.json", $ref: "../b/n.json" },
      "b/n.json": { $id: "elsewhere.json", type: "number" },
    });
    const compiled = validator.compile(schemas);
    expect(compiled.validate(1)).toEqual([]);
    expect(compiled.validate("x")).toEqual([
      {
        pointer: "",
        keyword: "type",
        params: { type: "number" },
        message: "must be number",
        propertyName: null,
      },
    ]);
  });

  it("does not check the keyword `format`", () => {
    const compiled = validator.compile(schemaSet({ "s.json": { type: "string", format: "date" } }));
    expect(compiled.validate("not a date")).toEqual([]);
  });

  it("raises a compile error for a schema that declares another draft", () => {
    const schemas = schemaSet({
      "a/root.json": { $schema: "http://json-schema.org/draft-07/schema#", type: "object" },
    });
    expect(() => validator.compile(schemas)).toThrow(SchemaCompileError);
    expect(() => validator.compile(schemas)).toThrow(/draft-07/);
  });
});
