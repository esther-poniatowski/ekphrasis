/**
 * Field disabled by a rule `forbidden-when`: the constraint that disables an unfilled field, and
 * the note stating its condition, so the author learns the rule before any issue arises.
 */
import type { JSX } from "preact";
import type { Constraint, Field } from "../../../domain";
import { useFormContext } from "./form-context";
import { InlineText } from "./inline-text";

/**
 * Constraint forbidding `field`, or a group containing it, when `field` is unfilled; `null` when
 * the field is enabled. A forbidden field holding a value stays enabled, so it can be cleared.
 */
export function useDisabling(field: Field): Constraint | null {
  const { constraints } = useFormContext();
  return field.unfilled ? constraints.forbidding(field.path) : null;
}

/**
 * Whether `constraint` forbids `field` itself rather than a group containing it. The forbidden
 * field alone is greyed and carries the note; the fields within it are disabled only.
 */
export function forbidsItself(field: Field, constraint: Constraint | null): boolean {
  return constraint !== null && constraint.path.length === field.path.length;
}

export function DisabledNote({
  field,
  constraint,
}: {
  readonly field: Field;
  readonly constraint: Constraint | null;
}): JSX.Element | null {
  if (constraint === null || !forbidsItself(field, constraint)) return null;
  return (
    <div class="ekphrasis-disabled-note">
      <InlineText text={`This field stays unfilled while ${constraint.condition}.`} />
    </div>
  );
}
