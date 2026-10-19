/**
 * Defects of a schema that declares as unfilled a value that it also admits for a field. The form
 * displays every unfilled value as an empty control, so such a value can never be chosen as an
 * answer, and the schema reads as if it were one.
 *
 * A field admits a value when its schema enumerates it, by the keyword `enum`, by a `oneOf` of
 * `const` values, or by a single `const`. A field that admits any text, such as one of type
 * `string`, is not reported, since every text field would be.
 */
import { choiceOptions } from "../form/kinds";
import type { SchemaIssue } from "../form/model";
import { printPatternPath } from "../paths/field-path";
import { walkFieldSchemas } from "../schema/field-walk";
import type { SchemaView } from "../schema/schema-view";
import { jsonEquals } from "./unfilled";

/** Defects of the schema `root`, one per field that enumerates a value of `x-unfilled`. */
export function admittedUnfilledValues(root: SchemaView): SchemaIssue[] {
  const unfilled = root.unfilledValues;
  if (unfilled.length === 0) return [];
  const issues: SchemaIssue[] = [];
  walkFieldSchemas(root, (schema, path) => {
    const options = choiceOptions(schema) ?? [];
    for (const value of unfilled) {
      if (!options.some((option) => jsonEquals(option.value, value))) continue;
      issues.push({
        path: printPatternPath(path),
        message: `The value \`${typeof value === "string" ? value : JSON.stringify(value)}\` is declared unfilled by the keyword \`x-unfilled\`, but also admitted by this field, so the form displays it as an empty value.`,
      });
    }
  });
  return issues;
}
