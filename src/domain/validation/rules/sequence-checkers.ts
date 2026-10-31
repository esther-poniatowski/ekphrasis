/**
 * Predefined checkers of field scope that read the items of a sequence: `unique-by` and
 * `sorted-by`. The optional argument `key` is a field path from each item, such as `symbol`;
 * without it, the items themselves are compared. Unfilled values are skipped.
 */
import type { YamlPath } from "../../model";
import { jsonEquals, type JsonValue } from "../../schema/json";
import { hasWildcard } from "../instance-data";
import type { BoundRule, Checker, Finding, RuleArguments, RuleContext } from "./declaration";

/** A filled value compared by a sequence checker, with its path and its position. */
interface ItemValue {
  readonly index: number;
  readonly path: YamlPath;
  readonly value: JsonValue;
}

/** Path from each item to its compared value; `[]` compares the items themselves. */
function keyPath(args: RuleArguments): YamlPath {
  const key = args.path("key");
  if (key === null) return [];
  if (hasWildcard(key.segments)) args.fail("its argument `key` must designate one node per item");
  return key.segments as YamlPath;
}

/** Filled values of the items of the sequence held by the declaring field, in order. */
function itemValues(context: RuleContext, key: YamlPath): ItemValue[] {
  const sequence = context.data.at(context.base);
  if (!Array.isArray(sequence)) return [];
  return sequence.flatMap((_, index) => {
    const path = [...context.base, index, ...key];
    const value = context.data.at(path);
    return context.data.unfilled.has(value) ? [] : [{ index, path, value: value as JsonValue }];
  });
}

function code(value: JsonValue): string {
  return `\`${typeof value === "string" ? value : JSON.stringify(value)}\``;
}

const uniqueBy: Checker = {
  name: "unique-by",
  bind(args): BoundRule {
    const key = keyPath(args);
    args.finish();
    return (context) => {
      const seen: ItemValue[] = [];
      const findings: Finding[] = [];
      for (const item of itemValues(context, key)) {
        const first = seen.find((earlier) => jsonEquals(earlier.value, item.value));
        if (first === undefined) {
          seen.push(item);
        } else {
          findings.push({
            path: item.path,
            message: `The value ${code(item.value)} repeats the value of item #${first.index + 1}.`,
          });
        }
      }
      return findings;
    };
  },
};

const ORDERS = ["ascending", "descending"] as const;

/** Sign of the comparison of two values of the same type, or `null` for incomparable values. */
function compareValues(a: JsonValue, b: JsonValue): number | null {
  if (typeof a === "number" && typeof b === "number") return Math.sign(a - b);
  if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0;
  return null;
}

const sortedBy: Checker = {
  name: "sorted-by",
  bind(args): BoundRule {
    const key = keyPath(args);
    const order = args.string("order") ?? "ascending";
    if (!(ORDERS as readonly string[]).includes(order)) {
      args.fail("its argument `order` must be `ascending` or `descending`");
    }
    args.finish();
    const direction = order === "ascending" ? 1 : -1;
    return (context) => {
      const findings: Finding[] = [];
      let previous: ItemValue | null = null;
      for (const item of itemValues(context, key)) {
        const sign = previous === null ? null : compareValues(item.value, previous.value);
        if (previous !== null && sign !== null && sign * direction < 0) {
          findings.push({
            path: item.path,
            message: `The value ${code(item.value)} breaks the ${order} order, since it follows ${code(previous.value)} of item #${previous.index + 1}.`,
          });
        }
        previous = item;
      }
      return findings;
    };
  },
};

export const SEQUENCE_CHECKERS: readonly Checker[] = [uniqueBy, sortedBy];
