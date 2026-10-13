import { describe, expect, it } from "vitest";
import { buildFormModel, issue, IssueIndex } from "../../../src/domain";
import { YamlDocumentParser } from "../../../src/infrastructure";
import { schemaSet } from "../../support/schemas";

const parser = new YamlDocumentParser();

describe("issue index", () => {
  const text = "task:\n  aim: x\nextra: 1\n";
  const model = buildFormModel(
    schemaSet({
      "s.json": {
        type: "object",
        properties: { task: { type: "object", properties: { aim: { type: "string" } } } },
      },
    }),
    parser.parse(text),
    text,
  );
  const index = IssueIndex.of(model, [
    issue(["task", "aim"], "enum", "Not admitted."),
    issue(["task", "aim"], "word-count", "Too long.", { severity: "warning" }),
    issue(["task", "tolerance"], "required", "Missing.", { missing: true }),
    issue(["extra"], "additionalProperties", "Outside."),
    issue([], "type", "Not a mapping."),
  ]);

  it("places each issue at its field, or at its key outside the schema", () => {
    expect(index.at("task.aim").map(({ checker }) => checker)).toEqual(["enum", "word-count"]);
    expect(index.at("extra").map(({ checker }) => checker)).toEqual(["additionalProperties"]);
  });

  it("displays at the top the issues of the root and of paths without a field", () => {
    expect(index.unplaced.map(({ id }) => id)).toEqual(["task.tolerance", ""]);
  });

  it("counts the issues under a path, and the issues of each mark", () => {
    expect(index.countWithin(["task"])).toBe(3);
    expect(index.countWithin(["ta"])).toBe(0);
    expect(index.countWithin([])).toBe(5);
    expect(index.counts).toEqual({ missing: 1, invalid: 3, warning: 1 });
  });
});
