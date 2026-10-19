/**
 * Section of a mapping field, headed by its label and the count of the issues within it, holding
 * one field per key. It displays the kind `group`, and every mapping kind until its dedicated
 * control exists.
 */
import type { JSX } from "preact";
import type { MappingField } from "../../../../domain";
import type { ControlProps } from "../control-registry";
import { DisabledNote, forbidsItself, useDisabling } from "../disabled-note";
import { FieldLabel, LockNote, useLockDisclosure } from "../field-label";
import { useFormContext } from "../form-context";
import { IssueCount, IssueList } from "../issue-list";
import { FieldList } from "./field-list";

export function GroupSection({ field }: ControlProps<MappingField>): JSX.Element {
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
        {field.kind === "alternatives" && <AlternativeLine field={field} />}
        <FieldList field={field} />
        {field.children.length === 0 && field.extraEntries.length === 0 && (
          <div class="ekphrasis-empty">No entries.</div>
        )}
      </div>
    </section>
  );
}

function AlternativeLine({ field }: { readonly field: MappingField }): JSX.Element {
  const index = field.selectedAlternative;
  const title = index === null ? null : (field.alternatives[index] ?? `Alternative ${index + 1}`);
  return (
    <div class="ekphrasis-alternative">
      {title === null ? "No alternative matches the value." : `Alternative: ${title}`}
    </div>
  );
}
