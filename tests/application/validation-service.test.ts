import { describe, expect, it } from "vitest";
import {
  ValidationService,
  type InstanceValidator,
  type SchemaValidator,
  type ValidationReport,
} from "../../src/application";
import { buildFormModel, type JsonValue, type SchemaSet } from "../../src/domain";
import { AjvSchemaValidator, YamlDocumentParser } from "../../src/infrastructure";
import { schemaSet } from "../support/schemas";

const parser = new YamlDocumentParser();
const service = new ValidationService(new AjvSchemaValidator());

function validate(schema: JsonValue, text: string, validation = service): ValidationReport {
  const schemas = schemaSet({ "s.json": schema });
  const tree = parser.parse(text);
  return validation.validate(schemas, buildFormModel(schemas, tree, text), tree);
}

function located(report: ValidationReport): [string, string, boolean][] {
  return report.issues.map(({ id, checker, missing }) => [id, checker, missing]);
}

const SCHEMA: JsonValue = {
  type: "object",
  "x-unfilled": ["open"],
  required: ["status", "count"],
  properties: {
    status: { enum: ["posed", "answered"] },
    count: { type: "integer", minimum: 1 },
    note: { type: "string" },
    task: {
      type: "object",
      properties: { aim: { enum: ["prediction", "explanation"] }, tolerance: { type: "number" } },
      if: { required: ["aim"], properties: { aim: { const: "prediction" } } },
      then: { required: ["tolerance"] },
    },
  },
};

describe("order of checks", () => {
  it("reports an unfilled required field as missing, and no other error on it", () => {
    expect(located(validate(SCHEMA, "status: open\ncount: 0\nnote: open\n"))).toEqual([
      ["status", "required", true],
      ["count", "minimum", false],
    ]);
  });

  it("raises no issue on an optional unfilled field, absent or null", () => {
    expect(validate(SCHEMA, "status: posed\ncount: 1\nnote:\ntask: open\n").issues).toEqual([]);
  });

  it("reports a field required by a condition at the field itself", () => {
    expect(located(validate(SCHEMA, "status: posed\ncount: 1\ntask: {aim: prediction}\n"))).toEqual(
      [["task.tolerance", "required", true]],
    );
    expect(
      located(
        validate(SCHEMA, "status: posed\ncount: 1\ntask: {aim: prediction, tolerance: open}\n"),
      ),
    ).toEqual([["task.tolerance", "required", true]]);
    expect(validate(SCHEMA, "status: posed\ncount: 1\ntask: {aim: open}\n").issues).toEqual([]);
  });

  it("reports each required field of an empty instance as missing", () => {
    expect(located(validate(SCHEMA, ""))).toEqual([
      ["status", "required", true],
      ["count", "required", true],
    ]);
    expect(located(validate({ type: "string" }, ""))).toEqual([["", "required", true]]);
  });

  it("runs the rules last, and drops a missing field that the standard keywords already report", () => {
    const schema = {
      ...(SCHEMA as object),
      "x-rules": [
        { check: "required-when", field: "count", when: { field: "status", filled: true } },
        { check: "required-when", field: "note", when: { field: "status", equals: "posed" } },
      ],
    };
    expect(located(validate(schema, "status: posed\n"))).toEqual([
      ["count", "required", true],
      ["note", "required-when", true],
    ]);
  });
});

describe("defects of the schema", () => {
  it("reports a schema refused by the validator, and still runs the rules", () => {
    const report = validate(
      {
        type: "object",
        properties: {
          id: { type: "string", pattern: "(", "x-rules": [{ check: "word-count", max: 1 }] },
        },
      },
      "id: two words\n",
    );
    expect(report.schemaIssues).toEqual([
      {
        path: "",
        message: expect.stringContaining(
          "The validator could not compile the schema: Invalid regular expression",
        ) as string,
      },
    ]);
    expect(located(report)).toEqual([["id", "word-count", false]]);
  });

  it("reports the malformed rule declarations", () => {
    const report = validate({ type: "object", "x-rules": [{ check: "spell" }] }, "a: 1\n");
    expect(report.schemaIssues).toEqual([
      { path: "", message: "The rule `spell` names no checker known to ekphrasis." },
    ]);
  });

  it("reports a required property without a field, and an unfilled value admitted by a field", () => {
    const schema: JsonValue = {
      type: "object",
      required: ["ghost"],
      "x-unfilled": ["open"],
      properties: { status: { enum: ["posed", "open"] } },
    };
    for (const text of ["status: posed\n", ""]) {
      expect(validate(schema, text).schemaIssues.map(({ path }) => path)).toEqual([
        "ghost",
        "status",
      ]);
    }
  });

  it("compiles a schema set once", () => {
    let compilations = 0;
    const counting: SchemaValidator = {
      compile(schemas: SchemaSet): InstanceValidator {
        compilations += 1;
        return new AjvSchemaValidator().compile(schemas);
      },
    };
    const validation = new ValidationService(counting);
    const schemas = schemaSet({ "s.json": SCHEMA });
    for (const text of ["status: posed\n", "status: answered\n"]) {
      const tree = parser.parse(text);
      validation.validate(schemas, buildFormModel(schemas, tree, text), tree);
    }
    expect(compilations).toBe(1);
  });
});
