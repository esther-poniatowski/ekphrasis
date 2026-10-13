import { describe, expect, it } from "vitest";
import {
  buildFormModel,
  checkRules,
  InstanceData,
  NO_HOST,
  UnfilledValues,
  type CheckerEnvironment,
  type JsonValue,
  type RuleReport,
} from "../../../src/domain";
import { YamlDocumentParser } from "../../../src/infrastructure";
import { schemaSet } from "../../support/schemas";

const parser = new YamlDocumentParser();

function check(
  schema: JsonValue,
  text: string,
  environment: CheckerEnvironment = NO_HOST,
): RuleReport {
  const tree = parser.parse(text);
  const model = buildFormModel(schemaSet({ "s.json": schema }), tree, text);
  const data = InstanceData.fromTree(tree, new UnfilledValues(model.unfilled));
  return checkRules(model.root, data, environment);
}

/** Schema of one property `value`, declaring `rules`. */
function field(schema: Record<string, JsonValue>, ...rules: JsonValue[]): JsonValue {
  return { type: "object", properties: { value: { ...schema, "x-rules": rules } } };
}

function found(report: RuleReport): [string, string][] {
  return report.issues.map(({ id, message }) => [id, message]);
}

describe("checkers of texts", () => {
  it("bounds the number of words and of sentences", () => {
    const schema = field(
      { type: "string" },
      { check: "word-count", max: 3 },
      { check: "sentence-count", min: 2 },
    );
    expect(found(check(schema, "value: One two three four.\n"))).toEqual([
      ["value", "The text holds 4 words, whereas at most 3 are admitted."],
      ["value", "The text holds 1 sentence, whereas at least 2 are required."],
    ]);
    expect(check(schema, "value: One two. Three!\n").issues).toEqual([]);
  });

  it.each([
    ["value: |\n  - item\n", "a list item at line 1"],
    ["value: |\n  first\n\n  second\n", "a paragraph break at line 2"],
    ["value: '> [!NOTE] text'\n", "a quote or a callout at line 1"],
    ["value: |\n  text\n  ## Heading\n", "a heading at line 2"],
  ])("rejects a Markdown block construct in %j", (text, construct) => {
    const report = check(field({ type: "string" }, { check: "inline-markdown" }), text);
    expect(report.issues[0]?.message).toBe(
      `The text holds ${construct}, whereas the field admits inline Markdown only.`,
    );
  });

  it("admits inline Markdown", () => {
    const schema = field({ type: "string" }, { check: "inline-markdown" });
    expect(check(schema, "value: 'A *term*, a [link](x.md) and $x - 1$.'\n").issues).toEqual([]);
  });

  it("reports the error of a formula through the environment, and nothing without a renderer", () => {
    const schema = field({ type: "string" }, { check: "latex" });
    const renderer = {
      formulaError: (source: string) => (source.includes("{") ? null : "Missing brace"),
    };
    expect(found(check(schema, "value: '\\frac a'\n", renderer))).toEqual([
      ["value", "The formula fails to render: Missing brace"],
    ]);
    expect(check(schema, "value: '\\frac a'\n").issues).toEqual([]);
  });
});

describe("checkers of sequences", () => {
  const items = { type: "array", items: { type: "object" } };

  it("reports the items that repeat a value under a key", () => {
    const schema = field(items, { check: "unique-by", key: "symbol" });
    const text =
      "value:\n  - {symbol: a}\n  - {symbol: b}\n  - {symbol: a}\n  - {symbol: open}\n  - {}\n";
    expect(found(check({ ...(schema as object), "x-unfilled": ["open"] }, text))).toEqual([
      ["value[2].symbol", "The value `a` repeats the value of item #1."],
    ]);
  });

  it("reports the items that break an order, and compares the items themselves without a key", () => {
    const schema = field({ type: "array" }, { check: "sorted-by", order: "descending" });
    expect(found(check(schema, "value: [3, 1, 2]\n"))).toEqual([
      ["value[2]", "The value `2` breaks the descending order, since it follows `1` of item #2."],
    ]);
  });
});

describe("relational and conditional checkers", () => {
  const dates = {
    type: "object",
    "x-rules": [{ check: "compare", left: "start", operator: "<=", right: "end" }],
    properties: { start: { type: "string" }, end: { type: "string" } },
  };

  it("compares two fields of the declaring group, and skips an unfilled one", () => {
    expect(found(check(dates, "start: 2026-10-13\nend: 2026-10-01\n"))).toEqual([
      ["start", "The value `2026-10-13` must be at most `2026-10-01`, the value of `end`."],
    ]);
    expect(check(dates, "start: 2026-10-13\nend:\n").issues).toEqual([]);
  });

  it("reads the paths of a rule from the field that declares it", () => {
    const schema = {
      type: "object",
      properties: { period: dates },
    };
    expect(found(check(schema, "period: {start: b, end: a}\n"))).toEqual([
      ["period.start", "The value `b` must be at most `a`, the value of `end`."],
    ]);
  });

  const aims = {
    type: "object",
    "x-unfilled": ["open", []],
    "x-rules": [
      {
        check: "required-when",
        field: "task.proof_obligations",
        when: { field: "task.epistemic_aim", equals: "modal-knowledge" },
      },
      {
        check: "forbidden-when",
        field: "task.tolerance",
        when: { field: "task.epistemic_aim", in: ["description", "exploration"] },
        severity: "warning",
      },
    ],
  };

  it("requires a field whenever its condition holds, absent and unfilled values alike", () => {
    expect(check(aims, "task:\n  epistemic_aim: modal-knowledge\n").issues).toEqual([
      expect.objectContaining({
        id: "task.proof_obligations",
        checker: "required-when",
        missing: true,
        message: "This field is required when `task.epistemic_aim` equals `modal-knowledge`.",
      }),
    ]);
    expect(
      check(aims, "task:\n  epistemic_aim: modal-knowledge\n  proof_obligations: []\n").issues,
    ).toHaveLength(1);
    expect(
      check(aims, "task:\n  epistemic_aim: modal-knowledge\n  proof_obligations: [p]\n").issues,
    ).toEqual([]);
    expect(check(aims, "task:\n  epistemic_aim: prediction\n").issues).toEqual([]);
  });

  it("forbids a field whenever its condition holds, with the severity of the declaration", () => {
    expect(check(aims, "task:\n  epistemic_aim: exploration\n  tolerance: 0.1\n").issues).toEqual([
      expect.objectContaining({
        id: "task.tolerance",
        severity: "warning",
        missing: false,
        message:
          "This field must stay unfilled when `task.epistemic_aim` is one of `description`, `exploration`.",
      }),
    ]);
  });

  it("binds the wildcard of a shared prefix to the same item", () => {
    const schema = {
      type: "object",
      "x-rules": [
        {
          check: "required-when",
          field: "foils[*].symbol",
          when: { field: "foils[*].name", filled: true },
          message: "A named foil needs a symbol.",
        },
      ],
    };
    const text = "foils:\n  - {name: decay, symbol: d}\n  - {name: aperiodic}\n  - {}\n";
    expect(found(check(schema, text))).toEqual([
      ["foils[1].symbol", "A named foil needs a symbol."],
    ]);
  });

  it("runs no rule on an unfilled field", () => {
    const schema = {
      type: "object",
      properties: { period: dates },
    };
    expect(check(schema, "other: 1\n").issues).toEqual([]);
  });
});

describe("declarations", () => {
  it.each([
    [
      { check: "word-count" },
      "The rule `word-count` is malformed: it requires the argument `min`, `max`, or both.",
    ],
    [
      { check: "word-count", max: 2, maxx: 3 },
      "The rule `word-count` is malformed: it admits no argument `maxx`.",
    ],
    [
      { check: "compare", left: "a", operator: "<<", right: "b" },
      "The rule `compare` is malformed: its operator must be one of `<`, `<=`, `=`, `!=`, `>=`, `>`.",
    ],
    [
      { check: "required-when", field: "a", when: { field: "b", equals: 1, in: [1] } },
      "The rule `required-when` is malformed: its condition `when` must apply exactly one test among `equals`, `in`, `filled`, `unfilled`.",
    ],
    [
      { check: "required-when", field: "a", when: { field: "b[*]", filled: true } },
      "The rule `required-when` is malformed: the path `b[*]` holds a wildcard outside the prefix that it shares with `a`.",
    ],
    [
      { check: "unique-by", key: "a..b" },
      "The rule `unique-by` is malformed: its argument `key`: Invalid field path `a..b` at offset 2: empty key.",
    ],
    [{ check: "spell" }, "The rule `spell` names no checker known to ekphrasis."],
    [
      { check: "latex", severity: "fatal" },
      "The rule `latex` sets the key `severity` to a value other than `error` or `warning`.",
    ],
    ["word-count", "A rule declaration must be a mapping."],
  ] as const)("reports a malformed declaration once: %j", (rule, message) => {
    const schema = {
      type: "object",
      properties: { items: { type: "array", items: { type: "string", "x-rules": [rule] } } },
    };
    expect(check(schema, "items: [a, b]\n").problems).toEqual([{ path: "items[0]", message }]);
  });

  it("reports a malformed declaration on an unfilled field", () => {
    const schema = field({ type: "string" }, { check: "word-count" });
    expect(check(schema, "other: 1\n").problems).toHaveLength(1);
  });
});
