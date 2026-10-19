/**
 * Constraints of the conditional rules, indexed for display: the form marks as required a field
 * that a rule `required-when` requires under the current values, and disables a field that a
 * rule `forbidden-when` forbids, together with the fields that it contains.
 */
import type { YamlPath } from "../model";
import { printFieldPath } from "../paths/field-path";
import type { Constraint } from "./rules/declaration";
import { startsWith } from "./issues";

export class ConstraintIndex {
  private readonly required: ReadonlySet<string>;
  private readonly forbidden: readonly Constraint[];

  constructor(constraints: readonly Constraint[]) {
    this.required = new Set(
      constraints
        .filter((constraint) => constraint.effect === "required")
        .map((constraint) => printFieldPath(constraint.path)),
    );
    this.forbidden = constraints.filter((constraint) => constraint.effect === "forbidden");
  }

  /** Whether a rule requires the field of identifier `id` under the current values. */
  requires(id: string): boolean {
    return this.required.has(id);
  }

  /**
   * Constraint that forbids the field at `path`, or a group containing it, under the current
   * values; `null` when no rule forbids it.
   */
  forbidding(path: YamlPath): Constraint | null {
    return this.forbidden.find((constraint) => startsWith(path, constraint.path)) ?? null;
  }
}
