/**
 * Run of the rules of the keyword `x-rules` over the fields of a form model.
 *
 * A rule runs at each field whose schema declares it, provided the field is filled: no rule runs
 * on an unfilled field, as the order of checks requires. A declaration that is malformed, or
 * that names no checker, is reported once as a defect of the schema, and its rule does not run.
 */
import type { Field, SchemaIssue } from "../../form/model";
import type { JsonValue } from "../../schema/json";
import type { InstanceData } from "../instance-data";
import { issue, type Issue } from "../issues";
import {
  parseDeclaration,
  RuleDeclarationError,
  type BoundRule,
  type Checker,
  type CheckerEnvironment,
  type RuleDeclaration,
} from "./declaration";
import { RELATIONAL_CHECKERS } from "./relational-checkers";
import { SEQUENCE_CHECKERS } from "./sequence-checkers";
import { TEXT_CHECKERS } from "./text-checkers";

/** Predefined checkers, by name. */
export const PREDEFINED_CHECKERS: ReadonlyMap<string, Checker> = new Map(
  [...TEXT_CHECKERS, ...SEQUENCE_CHECKERS, ...RELATIONAL_CHECKERS].map((checker) => [
    checker.name,
    checker,
  ]),
);

export interface RuleReport {
  readonly issues: readonly Issue[];
  /** Malformed declarations, each reported at the first field that declares it. */
  readonly problems: readonly SchemaIssue[];
}

type Binding =
  | { readonly declaration: RuleDeclaration; readonly rule: BoundRule }
  | { readonly problem: string };

/** Issues of the rules declared under `root`, on `data`. */
export function checkRules(
  root: Field,
  data: InstanceData,
  environment: CheckerEnvironment,
  checkers: ReadonlyMap<string, Checker> = PREDEFINED_CHECKERS,
): RuleReport {
  // A subschema is shared by every field that it describes, such as the items of a sequence, so
  // each declaration binds once, keyed by its value in the schema.
  const bindings = new Map<JsonValue, Binding>();
  const issues: Issue[] = [];
  const problems = new Map<string, SchemaIssue>();

  const bind = (raw: JsonValue): Binding => {
    const known = bindings.get(raw);
    if (known !== undefined) return known;
    let binding: Binding;
    try {
      const declaration = parseDeclaration(raw);
      const checker = checkers.get(declaration.check);
      binding =
        checker === undefined
          ? { problem: `The rule \`${declaration.check}\` names no checker known to ekphrasis.` }
          : { declaration, rule: checker.bind(declaration.args) };
    } catch (error) {
      if (!(error instanceof RuleDeclarationError)) throw error;
      binding = { problem: error.message };
    }
    bindings.set(raw, binding);
    return binding;
  };

  const visit = (field: Field): void => {
    const filled = field.rules.length > 0 && data.isFilled(field.path);
    for (const raw of field.rules) {
      const binding = bind(raw);
      if ("problem" in binding) {
        if (!problems.has(binding.problem)) {
          problems.set(binding.problem, { path: field.id, message: binding.problem });
        }
      } else if (filled) {
        const { declaration, rule } = binding;
        for (const finding of rule({ base: field.path, data, environment })) {
          issues.push(
            issue(finding.path, declaration.check, declaration.message ?? finding.message, {
              severity: declaration.severity,
              missing: finding.missing ?? false,
            }),
          );
        }
      }
    }
    const children = "children" in field ? field.children : "items" in field ? field.items : [];
    for (const child of children) visit(child);
  };

  visit(root);
  return { issues, problems: [...problems.values()] };
}
