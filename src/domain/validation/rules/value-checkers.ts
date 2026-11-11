/**
 * Predefined checkers of one field value whose admitted value carries workflow meaning rather
 * than a validation failure.
 */
import { jsonEquals } from "../../schema/json";
import type { BoundRule, Checker } from "./declaration";

const unresolvedValue: Checker = {
  name: "unresolved-value",
  bind(args): BoundRule {
    const expected = args.value("value");
    if (expected === undefined) args.fail("it requires the argument `value`");
    args.finish();
    return (context) =>
      jsonEquals(context.data.at(context.base), expected)
        ? [
            {
              path: context.base,
              message: "This field records an epistemically unresolved state.",
              unresolved: true,
            },
          ]
        : [];
  },
};

export const VALUE_CHECKERS: readonly Checker[] = [unresolvedValue];
