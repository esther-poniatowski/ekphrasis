/**
 * Section of a sequence field, headed by its label and the count of the issues within it,
 * holding one field per item. It displays every sequence kind until its dedicated control exists.
 */
import type { JSX } from "preact";
import type { SequenceField } from "../../../../domain";
import type { ControlProps } from "../control-registry";
import { DisabledNote, forbidsItself, useDisabling } from "../disabled-note";
import { FieldLabel, LockNote, useLockDisclosure } from "../field-label";
import { useFormContext } from "../form-context";
import { IssueCount, IssueList } from "../issue-list";
import { FieldView } from "../field-view";

export function SequenceSection({ field }: ControlProps<SequenceField>): JSX.Element {
  const disclosure = useLockDisclosure();
  const { issues } = useFormContext();
  const disabling = useDisabling(field);
  return (
    <section
      class="ekphrasis-group"
      data-path={field.id}
      data-kind={field.kind}
      data-disabled={forbidsItself(field, disabling) ? true : undefined}
    >
      <div class="ekphrasis-group-heading">
        <FieldLabel field={field} disclosure={disclosure} />
        <IssueCount count={issues.countWithin(field.path)} />
      </div>
      <LockNote field={field} disclosure={disclosure} />
      <DisabledNote field={field} constraint={disabling} />
      <IssueList issues={issues.at(field.id)} />
      <div class="ekphrasis-group-body">
        {field.items.map((item) => (
          <FieldView key={item.id} field={item} />
        ))}
        {field.items.length === 0 && <div class="ekphrasis-empty">No items.</div>}
      </div>
    </section>
  );
}
