/**
 * Heading of a group or a collection: the button folding the section, the label of the field,
 * the count of the issues within it, and the actions of an item or an entry, such as moving it.
 * The heading is laid out as the row of a field: its label fills the column of the labels, so its
 * help button stands in line with those of the fields, and the count and the actions take the
 * column of the controls. The fold button stands in the margin at the left of the label, so the
 * icon and the name align with those of the fields at the same depth. The instructions of the
 * field follow the heading while they are shown, also when the section is folded.
 */
import type { ComponentChildren, JSX } from "preact";
import type { Field } from "../../../../domain";
import { FieldHelp, guidanceOf } from "../field-help";
import { FieldLabel, type LockDisclosure } from "../field-label";
import { useFormContext } from "../form-context";
import { IssueCount } from "../issue-list";

/** Folded state of the section of `field`, with the action toggling it. */
export interface Fold {
  readonly folded: boolean;
  readonly toggle: () => void;
}

/** Fields whose section folds: a group or a collection, with the keyword `x-collapsed`. */
type FoldableField = Field & { readonly collapsed?: boolean };

export function useFold(field: FoldableField): Fold {
  const { folds } = useFormContext();
  const initial = field.collapsed ?? false;
  return {
    folded: folds.isFolded(field.uid, initial),
    toggle: () => folds.toggle(field.uid, initial),
  };
}

export function SectionHeading({
  field,
  fold,
  disclosure,
  actions = null,
}: {
  readonly field: Field;
  readonly fold: Fold;
  readonly disclosure: LockDisclosure;
  readonly actions?: ComponentChildren;
}): JSX.Element {
  const { issues } = useFormContext();
  return (
    <>
      <div class="ekphrasis-group-heading">
        <button
          type="button"
          class="ekphrasis-fold"
          aria-expanded={!fold.folded}
          aria-label={fold.folded ? `Expand ${field.label}` : `Collapse ${field.label}`}
          onClick={fold.toggle}
        >
          <ChevronIcon />
        </button>
        <FieldLabel field={field} disclosure={disclosure} />
        <div class="ekphrasis-group-tail">
          <IssueCount count={issues.countWithin(field.path)} />
          {actions}
        </div>
      </div>
      <FieldHelp helpKey={field.uid} guidance={guidanceOf(field)} />
    </>
  );
}

/** Chevron of the Lucide icon set, pointing down; the style turns it right when folded. */
function ChevronIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
