import { describe, expect, it } from "vitest";
import {
  CustomCheckerService,
  type CustomCheckerCall,
  type CustomCheckerItem,
  type CustomCheckerRunner,
} from "../../src/application";
import { buildFormModel, type JsonValue } from "../../src/domain";
import { YamlDocumentParser } from "../../src/infrastructure";
import { schemaSet } from "../support/schemas";

const parser = new YamlDocumentParser();
const registrations = [{ name: "project-check", module: "checks", function: "check" }];

class RecordingRunner implements CustomCheckerRunner {
  readonly calls: CustomCheckerCall[] = [];

  constructor(
    private readonly result: (
      call: CustomCheckerCall,
    ) => Promise<readonly CustomCheckerItem[]> = () => Promise.resolve([]),
  ) {}

  call(input: CustomCheckerCall): Promise<readonly CustomCheckerItem[]> {
    this.calls.push(input);
    return this.result(input);
  }

  restart(): Promise<void> {
    return Promise.resolve();
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

async function validate(
  schema: JsonValue,
  text: string,
  runner: CustomCheckerRunner | null,
  resolveFile: (path: string) => string = (path) => `/vault/${path}`,
) {
  const schemas = schemaSet({ "record.schema.json": schema });
  const tree = parser.parse(text);
  const model = buildFormModel(schemas, tree, text);
  const service = new CustomCheckerService(
    () => registrations,
    () => runner,
    resolveFile,
  );
  return service.validate("records/a.yml", model, tree);
}

describe("custom checker validation", () => {
  it("invokes a registered declaration with project data supplied through its ports", async () => {
    const runner = new RecordingRunner(() =>
      Promise.resolve([
        "Rejected claim",
        { message: "Related field", path: "other", severity: "warning" },
      ]),
    );
    const schema: JsonValue = {
      type: "object",
      properties: {
        claim: {
          type: "string",
          "x-rules": [{ check: "project-check", vocabulary: "terms.yml" }],
        },
        other: { type: "string" },
      },
    };

    const issues = await validate(schema, "claim: test\nother: context\n", runner);

    expect(runner.calls).toEqual([
      {
        checker: "project-check",
        value: "test",
        instance: { claim: "test", other: "context" },
        path: "claim",
        file: "/vault/records/a.yml",
        arguments: { vocabulary: "terms.yml" },
      },
    ]);
    expect(issues).toMatchObject([
      { id: "claim", checker: "project-check", severity: "error", message: "Rejected claim" },
      { id: "other", checker: "project-check", severity: "warning", message: "Related field" },
    ]);
  });

  it("skips unfilled fields and declarations whose names are not registered", async () => {
    const runner = new RecordingRunner();
    const schema: JsonValue = {
      type: "object",
      "x-unfilled": ["open"],
      properties: {
        empty: { "x-rules": [{ check: "project-check" }] },
        other: { "x-rules": [{ check: "another-project-check" }] },
      },
    };

    await expect(validate(schema, "empty: open\nother: value\n", runner)).resolves.toEqual([]);
    expect(runner.calls).toEqual([]);
  });

  it("reports that a registered checker could not run when the machine has no runner", async () => {
    const schema: JsonValue = {
      type: "object",
      properties: { claim: { "x-rules": [{ check: "project-check" }] } },
    };

    await expect(validate(schema, "claim: test\n", null)).resolves.toMatchObject([
      {
        id: "claim",
        checker: "project-check",
        severity: "warning",
        message:
          "The custom checker `project-check` did not run because Python checkers are unavailable.",
      },
    ]);
  });

  it("locates failures and malformed returned paths at the declaring field", async () => {
    const failure = new RecordingRunner(() => Promise.reject(new Error("checker failed")));
    const invalidPath = new RecordingRunner(() =>
      Promise.resolve([{ message: "bad path", path: "items[*]", severity: "error" }]),
    );
    const schema: JsonValue = {
      type: "object",
      properties: { claim: { "x-rules": [{ check: "project-check", severity: "warning" }] } },
    };

    await expect(validate(schema, "claim: test\n", failure)).resolves.toMatchObject([
      { id: "claim", severity: "warning", message: "checker failed" },
    ]);
    await expect(validate(schema, "claim: test\n", invalidPath)).resolves.toMatchObject([
      {
        id: "claim",
        message: "Invalid field path `items[*]`: an issue path admits no wildcard.",
      },
    ]);
  });
});

describe("instance checkers", () => {
  const instanceRegistration = {
    name: "tool",
    module: "ekphrasis_findings",
    function: "findings_log",
    schemas: ["tool:record@*"],
    arguments: { command: ["-m", "tool", "check", "{folder}"] },
  };
  const schema: JsonValue = {
    type: "object",
    properties: {
      title: { type: "string" },
      reading: { type: "string" },
      laws: {
        type: "array",
        items: {
          type: "object",
          properties: { symbol: { type: "string" }, expression: { type: "string" } },
        },
      },
    },
  };
  const text = "title: Relaxation\nlaws:\n  - symbol: f\n    expression: x = zz\n";

  async function check(
    runner: CustomCheckerRunner | null,
    reference: string,
    reason?: () => string,
  ) {
    const schemas = schemaSet({ "record.schema.json": schema });
    const tree = parser.parse(text);
    const model = buildFormModel(schemas, tree, text);
    const service = new CustomCheckerService(
      () => [instanceRegistration],
      () => runner,
      (path) => `/vault/${path}`,
      reason,
    );
    return service.validate("records/a.yml", model, tree, reference);
  }

  it("checks the whole instance of a matching schema with the arguments of the settings", async () => {
    const runner = new RecordingRunner();

    await check(runner, "tool:record@2");
    await check(runner, "other:record@2");

    expect(runner.calls).toEqual([
      {
        checker: "tool",
        value: { title: "Relaxation", laws: [{ symbol: "f", expression: "x = zz" }] },
        instance: { title: "Relaxation", laws: [{ symbol: "f", expression: "x = zz" }] },
        path: "",
        file: "/vault/records/a.yml",
        arguments: { command: ["-m", "tool", "check", "{folder}"] },
      },
    ]);
  });

  it("places a returned field path at its exact field", async () => {
    const runner = new RecordingRunner(() =>
      Promise.resolve([
        {
          message: "The expression is unresolved.",
          path: "laws[0].expression",
          severity: "error",
        },
      ]),
    );

    const issues = await check(runner, "tool:record@2");

    expect(issues).toEqual([
      expect.objectContaining({
        path: ["laws", 0, "expression"],
        id: "laws[0].expression",
      }),
    ]);
  });

  it("keeps the field that controls a returned issue", async () => {
    const runner = new RecordingRunner(() =>
      Promise.resolve([
        {
          message: "The current title requires an expression.",
          path: "laws[0].expression",
          controlled_by: "/title",
          severity: "error",
        },
      ]),
    );

    const issues = await check(runner, "tool:record@2");

    expect(issues).toEqual([
      expect.objectContaining({
        path: ["laws", 0, "expression"],
        controlledBy: ["title"],
      }),
    ]);
  });

  it("ignores a controlling decision that designates no form field", async () => {
    const runner = new RecordingRunner(() =>
      Promise.resolve(
        ["title", "/nothing", ""].map((controlled_by) => ({
          message: "The checker supplied an unusable controller.",
          path: "laws[0].expression",
          controlled_by,
          severity: "error" as const,
        })),
      ),
    );

    const issues = await check(runner, "tool:record@2");

    expect(issues.map((item) => item.controlledBy)).toEqual([undefined, undefined, undefined]);
  });

  it("places a finding of a findings log at its field and keeps what the tool states", async () => {
    const runner = new RecordingRunner(() =>
      Promise.resolve([
        {
          message: "laws.expression -> zz",
          pointer: "/laws",
          discriminator: "f/expression/zz",
          severity: "error",
          rule: "area/unresolved",
          result_class: "method-conformance finding",
          repair_condition: "Every identifier resolves.",
          documentation_target: "docs/rules.md#^resolution",
          source_file: "inquiry/record.yml",
        },
        { message: "No reading", pointer: "/reading", severity: "error" },
        { message: "Elsewhere", pointer: "/nothing", severity: "error" },
        { message: "Typed", locus: "term:glossary", severity: "warning" },
      ]),
    );

    const issues = await check(runner, "tool:record@2");

    expect(issues).toEqual([
      {
        path: ["laws", 0, "expression"],
        id: "laws[0].expression",
        checker: "tool",
        severity: "error",
        missing: false,
        message: "laws.expression -> zz",
        origin: {
          rule: "area/unresolved",
          resultClass: "method-conformance finding",
          repairCondition: "Every identifier resolves.",
          documentationTarget: "docs/rules.md#^resolution",
          sourceFile: "inquiry/record.yml",
          locus: "/laws",
          discriminator: "f/expression/zz",
        },
      },
      {
        path: ["reading"],
        id: "reading",
        checker: "tool",
        severity: "error",
        missing: true,
        message: "No reading",
        origin: { locus: "/reading" },
      },
      {
        path: ["nothing"],
        id: "nothing",
        checker: "tool",
        severity: "error",
        missing: false,
        message: "Elsewhere",
        origin: { locus: "/nothing" },
      },
      {
        path: [],
        id: "",
        checker: "tool",
        severity: "warning",
        missing: false,
        message: "Typed",
        origin: { locus: "term:glossary" },
      },
    ]);
  });

  it("keeps a checker context outside the issue list", async () => {
    const runner = new RecordingRunner(() =>
      Promise.resolve([
        {
          kind: "context",
          label: "Completion target",
          value: "question-typed",
          description: "Checks completion through the typed question.",
          result_class: "computed inquiry diagnosis",
          documentation_target: "docs/scopes.md#question-typed",
        },
      ]),
    );
    const schemas = schemaSet({ "record.schema.json": schema });
    const tree = parser.parse(text);
    const model = buildFormModel(schemas, tree, text);
    const service = new CustomCheckerService(
      () => [instanceRegistration],
      () => runner,
      (path) => `/vault/${path}`,
    );

    await expect(
      service.validateReport("records/a.yml", model, tree, "tool:record@2"),
    ).resolves.toEqual({
      issues: [],
      contexts: [
        {
          checker: "tool",
          label: "Completion target",
          value: "question-typed",
          description: "Checks completion through the typed question.",
          resultClass: "computed inquiry diagnosis",
          documentationTarget: "docs/scopes.md#question-typed",
        },
      ],
    });
  });

  it("states at the root why the checker could not run on this machine", async () => {
    const issues = await check(null, "tool:record@2", () => "Python checkers run on desktop only");

    expect(issues).toMatchObject([
      {
        id: "",
        checker: "tool",
        severity: "warning",
        message:
          "The custom checker `tool` did not run because Python checkers run on desktop only.",
      },
    ]);
  });
});
