/**
 * Row of a field: its label, marked when the field is required or locked, its instructions while
 * they are shown, the content area
 * holding its control and the actions of an item, the note of a field disabled by a rule, the
 * reason of a refused commit, and the issues of the field.
 */
import type { ComponentChildren, JSX } from "preact";
import type { Field } from "../../../domain";
import { FieldHelp } from "./field-help";
import { FieldLabel, LockNote, useLockDisclosure } from "./field-label";
import { useFormContext } from "./form-context";
import { DisabledNote, forbidsItself, useDisabling } from "./disabled-note";
import { fieldMark, IssueList } from "./issue-list";

export function FieldRow({
  field,
  error = null,
  actions = null,
  children,
}: {
  readonly field: Field;
  /** Reason of the last refused commit at the field, or `null`. */
  readonly error?: string | null;
  /** Actions of the field as an item of its sequence, beside its control. */
  readonly actions?: ComponentChildren;
  readonly children: ComponentChildren;
}): JSX.Element {
  const disclosure = useLockDisclosure();
  const issues = useFormContext().issues.at(field.id);
  const disabling = useDisabling(field);
  return (
    <div
      class="ekphrasis-field"
      data-path={field.id}
      data-issue={fieldMark(issues) ?? undefined}
      data-disabled={forbidsItself(field, disabling) ? true : undefined}
    >
      <FieldLabel field={field} disclosure={disclosure} />
      <FieldHelp helpKey={field.uid} guidance={field} />
      {actions === null ? (
        <div class="ekphrasis-field-content">{children}</div>
      ) : (
        <div class="ekphrasis-field-content mod-actions">
          <div class="ekphrasis-field-control">{children}</div>
          {actions}
        </div>
      )}
      <LockNote field={field} disclosure={disclosure} />
      <DisabledNote field={field} constraint={disabling} />
      {error !== null && (
        <div class="ekphrasis-commit-error" role="alert">
          {error}
        </div>
      )}
      <IssueList issues={issues} />
    </div>
  );
}
