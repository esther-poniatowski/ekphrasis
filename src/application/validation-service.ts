/**
 * Use case that validates an instance against its schema, in the order of checks that the
 * feature note on validation fixes:
 *
 * 1. Unfilled values are set apart: the entries of mappings holding one are removed from the
 *    value given to the validator. A required field left unfilled then fails the keyword
 *    `required` only, and is reported as missing; an optional one raises no issue.
 * 2. The standard keywords of JSON Schema check the remaining values, through the validator.
 * 3. The rules of the keyword `x-rules` run on the filled fields.
 *
 * A schema set is compiled once, at its first validation, and reused for every commit. The
 * defects of the schema that no instance affects, such as a required property absent from the
 * properties, are found once as well, and reported with every validation.
 */
import {
  checkRules,
  InstanceData,
  issue,
  issuesFromValidatorErrors,
  MISSING_MESSAGE,
  NO_HOST,
  pruneUnfilled,
  SchemaView,
  undeclaredRequirements,
  UnfilledValues,
  type CheckerEnvironment,
  type FormModel,
  type Issue,
  type JsonValue,
  type SchemaIssue,
  type SchemaSet,
  type YamlNode,
} from "../domain";
import { SchemaCompileError } from "../errors";
import type { InstanceValidator, SchemaValidator } from "./protocols";

export interface ValidationReport {
  readonly issues: readonly Issue[];
  /**
   * Defects of the schema found while validating: a schema refused by the validator, a required
   * property absent from the properties, and rule declarations that are malformed or name no
   * checker.
   */
  readonly schemaIssues: readonly SchemaIssue[];
}

export class ValidationService {
  private readonly compiled = new WeakMap<SchemaSet, InstanceValidator | SchemaCompileError>();
  private readonly defects = new WeakMap<SchemaSet, readonly SchemaIssue[]>();

  constructor(
    private readonly validator: SchemaValidator,
    private readonly environment: CheckerEnvironment = NO_HOST,
  ) {}

  /** Report of the instance `tree`, whose form model under `schemas` is `model`. */
  validate(schemas: SchemaSet, model: FormModel, tree: YamlNode): ValidationReport {
    const data = InstanceData.fromTree(tree, new UnfilledValues(model.unfilled));
    const defects = this.defectsOf(schemas);
    const rootUnfilled = data.unfilled.has(data.value);
    if (rootUnfilled && !("children" in model.root)) {
      return {
        issues: [issue([], "required", MISSING_MESSAGE, { missing: true })],
        schemaIssues: defects,
      };
    }
    // An empty instance is validated as an empty mapping, so each required field is reported.
    const instance: JsonValue = rootUnfilled ? {} : pruneUnfilled(data.value, data.unfilled);

    const schemaIssues: SchemaIssue[] = [...defects];
    let standard: Issue[] = [];
    const validator = this.validatorOf(schemas);
    if (validator instanceof SchemaCompileError) {
      schemaIssues.push({ path: "", message: validator.message });
    } else {
      standard = issuesFromValidatorErrors(validator.validate(instance), instance);
    }

    const rules = checkRules(model.root, data, this.environment);
    return {
      issues: [...standard, ...withoutRepeatedMissing(standard, rules.issues)],
      schemaIssues: [...schemaIssues, ...rules.problems],
    };
  }

  private defectsOf(schemas: SchemaSet): readonly SchemaIssue[] {
    let defects = this.defects.get(schemas);
    if (defects === undefined) {
      const root = SchemaView.root(schemas);
      defects = undeclaredRequirements(root);
      this.defects.set(schemas, defects);
    }
    return defects;
  }

  private validatorOf(schemas: SchemaSet): InstanceValidator | SchemaCompileError {
    let validator = this.compiled.get(schemas);
    if (validator === undefined) {
      try {
        validator = this.validator.compile(schemas);
      } catch (error) {
        if (!(error instanceof SchemaCompileError)) throw error;
        validator = error;
      }
      this.compiled.set(schemas, validator);
    }
    return validator;
  }
}

/** Issues of `later` without those reporting missing a field that `earlier` reports missing. */
function withoutRepeatedMissing(earlier: readonly Issue[], later: readonly Issue[]): Issue[] {
  const missing = new Set(earlier.filter((item) => item.missing).map((item) => item.id));
  return later.filter((item) => !(item.missing && missing.has(item.id)));
}
