/**
 * Predefined checkers of relational and conditional scope: `compare`, `required-when` and
 * `forbidden-when`. Each relates two field paths, written from the field that declares the rule:
 * a subject path, where an issue is reported (`left`, `field`), and a reference path (`right`,
 * the field of the condition `when`).
 *
 * The two paths expand jointly: a wildcard of the prefix that both paths share binds the same
 * item in both, so `foils[*].symbol` and `foils[*].name` relate the symbol and the name of each
 * foil. After that prefix, a wildcard is admitted in the subject path only.
 */
import type { JsonValue } from "../../schema/json";
import { commonPrefixLength, hasWildcard } from "../instance-data";
import { jsonEquals } from "../unfilled";
import type { BoundRule, Checker, Finding, RuleArguments, RulePath } from "./declaration";

function code(value: JsonValue | undefined): string {
  return `\`${typeof value === "string" ? value : JSON.stringify(value ?? null)}\``;
}

/** Fails when `reference` holds a wildcard outside the prefix it shares with `subject`. */
function requireBoundReference(args: RuleArguments, subject: RulePath, reference: RulePath): void {
  const shared = commonPrefixLength(subject.segments, reference.segments);
  if (hasWildcard(reference.segments.slice(shared))) {
    args.fail(
      `the path \`${reference.text}\` holds a wildcard outside the prefix that it shares with \`${subject.text}\``,
    );
  }
}

// --- Comparison ----------------------------------------------------------------------------------

const OPERATORS: Readonly<
  Record<string, { readonly words: string; readonly holds: (sign: number) => boolean }>
> = {
  "<": { words: "less than", holds: (sign) => sign < 0 },
  "<=": { words: "at most", holds: (sign) => sign <= 0 },
  "=": { words: "equal to", holds: (sign) => sign === 0 },
  "!=": { words: "different from", holds: (sign) => sign !== 0 },
  ">=": { words: "at least", holds: (sign) => sign >= 0 },
  ">": { words: "greater than", holds: (sign) => sign > 0 },
};

/**
 * Sign of the comparison of `a` with `b`: numbers by value, texts by code points (so dates and
 * times written in ISO 8601 compare in time order). Other values compare by equality only, and
 * yield `null` for the ordering operators.
 */
function sign(a: JsonValue, b: JsonValue, ordered: boolean): number | null {
  if (typeof a === "number" && typeof b === "number") return Math.sign(a - b);
  if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0;
  if (ordered) return null;
  return jsonEquals(a, b) ? 0 : 1;
}

const compare: Checker = {
  name: "compare",
  bind(args): BoundRule {
    const left = args.requiredPath("left");
    const right = args.requiredPath("right");
    const symbol = args.string("operator") ?? args.fail("it requires the argument `operator`");
    const operator =
      OPERATORS[symbol] ??
      args.fail(
        `its operator must be one of ${Object.keys(OPERATORS)
          .map((key) => `\`${key}\``)
          .join(", ")}`,
      );
    requireBoundReference(args, left, right);
    args.finish();
    const ordered = symbol !== "=" && symbol !== "!=";
    return ({ base, data }) =>
      data
        .pairs(base, left.segments, right.segments)
        .flatMap(({ subject, reference }): Finding[] => {
          if (!data.isFilled(subject) || !data.isFilled(reference)) return [];
          const a = data.at(subject) as JsonValue;
          const b = data.at(reference) as JsonValue;
          const result = sign(a, b, ordered);
          if (result === null || operator.holds(result)) return [];
          return [
            {
              path: subject,
              message: `The value ${code(a)} must be ${operator.words} ${code(b)}, the value of \`${right.text}\`.`,
            },
          ];
        });
  },
};

// --- Conditions ----------------------------------------------------------------------------------

/** A condition `when`: one test applied to the value of one field. */
interface Condition {
  readonly path: RulePath;
  /** Whether the condition holds, given the value and whether it counts as filled. */
  readonly holds: (value: JsonValue | undefined, filled: boolean) => boolean;
  /** Statement of the condition, for the messages. */
  readonly statement: string;
}

const TESTS = ["equals", "in", "filled", "unfilled"] as const;

function parseCondition(args: RuleArguments): Condition {
  const when = args.mapping("when");
  const path = when.requiredPath("field");
  const present = TESTS.filter((test) => when.value(test) !== undefined);
  if (present.length !== 1) {
    args.fail(
      `its condition \`when\` must apply exactly one test among ${TESTS.map((test) => `\`${test}\``).join(", ")}`,
    );
  }
  const test = present[0]!;
  const operand = when.value(test) as JsonValue;
  when.finish();
  const field = `\`${path.text}\``;
  switch (test) {
    case "equals":
      return {
        path,
        holds: (value) => value !== undefined && jsonEquals(value, operand),
        statement: `${field} equals ${code(operand)}`,
      };
    case "in": {
      if (!Array.isArray(operand)) args.fail("the test `in` of its condition must hold a sequence");
      const values = operand as readonly JsonValue[];
      return {
        path,
        holds: (value) =>
          value !== undefined && values.some((candidate) => jsonEquals(value, candidate)),
        statement: `${field} is one of ${values.map(code).join(", ")}`,
      };
    }
    case "filled":
    case "unfilled": {
      if (operand !== true) args.fail(`the test \`${test}\` of its condition must hold \`true\``);
      return {
        path,
        holds: (_, filled) => filled === (test === "filled"),
        statement: `${field} is ${test}`,
      };
    }
  }
}

/** Checker of a field that must be filled, or unfilled, whenever a condition holds. */
function conditional(name: string, required: boolean): Checker {
  return {
    name,
    bind(args): BoundRule {
      const field = args.requiredPath("field");
      const condition = parseCondition(args);
      requireBoundReference(args, field, condition.path);
      args.finish();
      return ({ base, data }) =>
        data
          .pairs(base, field.segments, condition.path.segments)
          .flatMap(({ subject, reference }): Finding[] => {
            if (!condition.holds(data.at(reference), data.isFilled(reference))) return [];
            if (data.isFilled(subject) === required) return [];
            return required
              ? [
                  {
                    path: subject,
                    message: `This field is required when ${condition.statement}.`,
                    missing: true,
                  },
                ]
              : [
                  {
                    path: subject,
                    message: `This field must stay unfilled when ${condition.statement}.`,
                  },
                ];
          });
    },
  };
}

export const RELATIONAL_CHECKERS: readonly Checker[] = [
  compare,
  conditional("required-when", true),
  conditional("forbidden-when", false),
];
