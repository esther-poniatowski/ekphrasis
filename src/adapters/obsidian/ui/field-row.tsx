/**
 * Row of a field: its label, marked when the field is required or locked, the content area
 * holding its control, the reason of a refused commit, and the issues of the field.
 */
import type { ComponentChildren, JSX } from "preact";
import type { Field } from "../../../domain";
import { FieldLabel, LockNote, useLockDisclosure } from "./field-label";
import { useFormContext } from "./form-context";
import { IssueList, severityOf } from "./issue-list";

export function FieldRow({
  field,
  error = null,
  children,
}: {
  readonly field: Field;
  /** Reason of the last refused commit at the field, or `null`. */
  readonly error?: string | null;
  readonly children: ComponentChildren;
}): JSX.Element {
  const disclosure = useLockDisclosure();
  const issues = useFormContext().issues.at(field.id);
  return (
    <div class="ekphrasis-field" data-path={field.id} data-issue={severityOf(issues) ?? undefined}>
      <FieldLabel field={field} disclosure={disclosure} />
      <div class="ekphrasis-field-content">{children}</div>
      <LockNote field={field} disclosure={disclosure} />
      {error !== null && (
        <div class="ekphrasis-commit-error" role="alert">
          {error}
        </div>
      )}
      <IssueList issues={issues} />
    </div>
  );
}
