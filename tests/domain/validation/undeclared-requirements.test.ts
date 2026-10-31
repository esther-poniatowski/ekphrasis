import { describe, expect, it } from "vitest";
import { undeclaredRequirements, type JsonValue } from "../../../src/domain";
import { view } from "../../support/schemas";

const paths = (schema: JsonValue): string[] =>
  undeclaredRequirements(view(schema)).map(({ path }) => path);

describe("required properties absent from the properties", () => {
  it("reports a key of `required` that no property declares, naming it", () => {
    expect(
      undeclaredRequirements(
        view({ type: "object", required: ["a", "b"], properties: { a: { type: "string" } } }),
      ),
    ).toEqual([
      {
        path: "b",
        message:
          "The property `b` is required by the keyword `required`, but absent from the properties of its group, so the form displays no field for it.",
      },
    ]);
  });

  it("reports the keys required by `then`, `else`, `allOf` and `dependentRequired`", () => {
    const issues = undeclaredRequirements(
      view({
        type: "object",
        properties: { aim: { type: "string" }, a: { type: "string" } },
        if: { required: ["aim"], properties: { aim: { const: "explanation" } } },
        then: { required: ["explanans"] },
        else: { required: ["a", "other"] },
        allOf: [{ required: ["joined"] }],
        dependentRequired: { a: ["aim", "dependent"] },
      }),
    );
    expect(issues.map(({ path, message }) => [path, message.split(",")[0]])).toEqual([
      [
        "dependent",
        "The property `dependent` is required by the keyword `dependentRequired` when `a` is present",
      ],
      ["explanans", "The property `explanans` is required by the keyword `then`"],
      ["other", "The property `other` is required by the keyword `else`"],
      [
        "joined",
        "The property `joined` is required by the keyword `required` inside a subschema composed by `$ref` or `allOf`",
      ],
    ]);
  });

  it("reports the field of a rule `required-when` that no property declares", () => {
    expect(
      paths({
        type: "object",
        "x-rules": [
          { check: "required-when", field: "task.missing", when: { field: "aim", equals: 1 } },
          { check: "required-when", field: "items[*].ghost", when: { field: "aim", equals: 1 } },
          { check: "required-when", field: "task.kept", when: { field: "aim", equals: 1 } },
        ],
        properties: {
          aim: { type: "integer" },
          task: { type: "object", properties: { kept: { type: "string" } } },
          items: { type: "array", items: { type: "object", properties: { name: {} } } },
        },
      }),
    ).toEqual(["task.missing", "items[*].ghost"]);
  });

  it("walks nested groups, items and keyed entries, with paths holding wildcards", () => {
    expect(
      paths({
        type: "object",
        properties: {
          group: { type: "object", required: ["x"], properties: {} },
          list: { type: "array", items: { type: "object", required: ["y"] } },
          map: { type: "object", additionalProperties: { type: "object", required: ["z"] } },
        },
      }),
    ).toEqual(["group.x", "list[*].y", "map.*.z"]);
  });

  it("counts the properties of the alternatives of a `oneOf` as declared", () => {
    expect(
      paths({
        type: "object",
        required: ["concept"],
        oneOf: [
          { required: ["concept"], properties: { concept: { type: "string" } } },
          { required: ["undeclared"], properties: { undeclared: { type: "boolean" } } },
        ],
      }),
    ).toEqual([]);
  });

  it("terminates on a recursive schema, and reports a shared subschema once", () => {
    const node: JsonValue = {
      type: "object",
      required: ["leaf"],
      properties: { children: { type: "array", items: { $ref: "#" } } },
    };
    expect(paths(node)).toEqual(["leaf"]);
  });
});
