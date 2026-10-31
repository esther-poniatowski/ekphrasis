/**
 * Defects of a schema whose subschemas, composed for one field by `$ref` or `allOf`, impose
 * constraints that no single control can express. The control of such a field follows the
 * nearest declaration of the conflicting keyword, whereas the validator checks every subschema,
 * so the author may meet issues that the control cannot avoid. Three conflicts are reported:
 *
 * - the keywords `type` of the subschemas admit no common type;
 * - the enumerations of the subschemas (`enum`, a `oneOf` of `const` values, or a `const`) admit
 *   no common value;
 * - several subschemas declare alternatives by a `oneOf` of object schemas, whereas the form
 *   displays the alternatives of one keyword.
 */
import { commonOptions, enumerations, isAlternatives, type ChoiceOption } from "../form/kinds";
import type { SchemaIssue } from "../form/model";
import { printPatternPath } from "../paths/field-path";
import { walkFieldSchemas } from "../schema/field-walk";
import { commonTypes } from "../schema/schema-view";
import type { SchemaView } from "../schema/schema-view";

/** Defects of the schema `root`, one per conflict of the subschemas composed for a field. */
export function compositionConflicts(root: SchemaView): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  walkFieldSchemas(root, (schema, path) => {
    const parts = schema.parts();
    if (parts.length < 2) return;
    const report = (message: string): void => {
      issues.push({ path: printPatternPath(path), message });
    };
    const types = parts.map((part) => part.types).filter((names) => names.length > 0);
    if (types.length > 1 && commonTypes(types).length === 0) {
      report(
        `The subschemas composed by \`$ref\` or \`allOf\` admit no common type: ${types.map(listOfNames).join(" against ")}. The form follows the nearest declaration.`,
      );
    }
    const lists = enumerations(schema);
    if (lists.length > 1 && commonOptions(lists).length === 0) {
      report(
        `The subschemas composed by \`$ref\` or \`allOf\` admit no common value: ${lists.map(listOfValues).join(" against ")}. The form follows the nearest declaration.`,
      );
    }
    if (parts.filter(isAlternatives).length > 1) {
      report(
        "Several subschemas composed by `$ref` or `allOf` declare alternatives by `oneOf`, whereas the form displays the alternatives of one keyword. The form follows the nearest declaration.",
      );
    }
  });
  return issues;
}

function listOfNames(names: readonly string[]): string {
  return `[${names.join(", ")}]`;
}

function listOfValues(options: readonly ChoiceOption[]): string {
  return `[${options.map(({ value }) => (typeof value === "string" ? value : JSON.stringify(value))).join(", ")}]`;
}
