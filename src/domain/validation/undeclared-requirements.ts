/**
 * Defects of a schema that requires a property absent from its properties. The form displays one
 * field per declared property, so such a property has no field, and an author told that it is
 * missing cannot find where to fill it.
 *
 * Four declarations can require a property: the keyword `required`, the keyword
 * `dependentRequired`, the keyword `required` inside the branches `then` and `else`, and the rule
 * `required-when` of the keyword `x-rules`. Each declaration is read in the group and in every
 * subschema that the group composes by `$ref` or `allOf`. A property counts as declared when the keyword
 * `properties` of its group, or of a subschema that the group composes, declares it, or the
 * keyword `properties` of an alternative of the `oneOf` of that group, since the form displays
 * each of them.
 */
import type { SchemaIssue } from "../form/model";
import {
  ANY_KEY,
  FieldPathError,
  parseFieldPath,
  printPatternPath,
  type PatternSegment,
} from "../paths/field-path";
import { displayedProperties, walkFieldSchemas } from "../schema/field-walk";
import { isJsonObject } from "../schema/json";
import type { PropertySchema, SchemaView } from "../schema/schema-view";

/** Defects of the schema `root`, each naming the required property that no field displays. */
export function undeclaredRequirements(root: SchemaView): SchemaIssue[] {
  const found = new Map<string, SchemaIssue>();
  const report = (key: string, group: readonly PatternSegment[], source: string): void => {
    const issue: SchemaIssue = {
      path: printPatternPath([...group, key]),
      message: `The property \`${key}\` is required by ${source}, but absent from the properties of its group, so the form displays no field for it.`,
    };
    const id = `${issue.path}\n${issue.message}`;
    if (!found.has(id)) found.set(id, issue);
  };

  walkFieldSchemas(root, (schema, path) => {
    const declared = new Set(displayedProperties(schema).map(({ key }) => key));
    const check = (scope: SchemaView, keyword: string): void => {
      requirementsOf(scope, keyword, (key, source) => {
        if (!declared.has(key)) report(key, path, source);
      });
    };
    check(schema, "the keyword `required`");
    for (const alternative of schema.oneOf()) {
      check(alternative, "the keyword `required` of an alternative");
    }
    for (const field of requiredWhenFields(schema)) {
      const missing = firstUndeclared(schema, field);
      if (missing !== null)
        report(missing.key, [...path, ...missing.group], "the rule `required-when`");
    }
  });
  return [...found.values()];
}

/**
 * Calls `found` with each key that `scope` requires of its value, and the declaration that
 * requires it. The scope is the schema of a group, or a subschema applying to the same value: a
 * branch or an alternative. A declaration of a subschema that the scope composes is named as
 * such.
 */
function requirementsOf(
  scope: SchemaView,
  keyword: string,
  found: (key: string, source: string) => void,
): void {
  scope.parts().forEach((part, index) => {
    const where = index === 0 ? "" : " inside a subschema composed by `$ref` or `allOf`";
    for (const key of part.required) found(key, keyword + where);
    for (const [trigger, keys] of part.dependentRequired) {
      for (const key of keys) {
        found(key, `the keyword \`dependentRequired\`${where} when \`${trigger}\` is present`);
      }
    }
    for (const branch of part.branches()) {
      requirementsOf(branch.schema, `the keyword \`${branch.keyword}\`${where}`, found);
    }
  });
}

/** Paths of the fields named by the rules `required-when` of `schema`; malformed ones are skipped. */
function requiredWhenFields(schema: SchemaView): PatternSegment[][] {
  return schema.rules.flatMap((rule) => {
    if (!isJsonObject(rule) || rule["check"] !== "required-when") return [];
    const field = rule["field"];
    if (typeof field !== "string") return [];
    try {
      return [parseFieldPath(field)];
    } catch (error) {
      // A malformed path is reported with the other defects of the declaration.
      if (error instanceof FieldPathError) return [];
      throw error;
    }
  });
}

/**
 * First key of `segments`, followed from `schema`, that its group does not declare, with the
 * path of that group from `schema`; `null` when every key is declared, or when the path crosses
 * a value that no subschema describes, which the other checks report.
 */
function firstUndeclared(
  schema: SchemaView,
  segments: readonly PatternSegment[],
): { readonly key: string; readonly group: readonly PatternSegment[] } | null {
  let current: SchemaView | null = schema;
  const group: PatternSegment[] = [];
  for (const segment of segments) {
    if (typeof segment === "string") {
      const property: PropertySchema | undefined = displayedProperties(current).find(
        ({ key }) => key === segment,
      );
      if (property === undefined) return { key: segment, group };
      current = property.schema;
    } else {
      current = segment === ANY_KEY ? current.dynamicSchema() : current.items();
    }
    if (current === null) return null;
    group.push(segment);
  }
  return null;
}
