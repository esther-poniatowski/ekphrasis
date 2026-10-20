/**
 * Section of a mapping keyed by identifiers whose entries hold nested values, for the kind
 * `keyed-records`: one collapsible group per entry, headed by its identifier, with the action
 * removing it. A new entry is added under an identifier typed by the author, as a draft written
 * by its first edited value.
 */
import type { JSX } from "preact";
import { placeField, type MappingField } from "../../../../domain";
import type { ControlProps } from "../control-registry";
import { DisabledNote, forbidsItself, useDisabling } from "../disabled-note";
import { LockNote, useLockDisclosure } from "../field-label";
import { FieldView } from "../field-view";
import { useFormContext } from "../form-context";
import { IssueList } from "../issue-list";
import { useDraft } from "./draft";
import { ExtraEntries } from "./extra-entries";
import { ActionButton, EntryActions } from "./item-actions";
import { KeyAdder } from "./key-adder";
import { SectionHeading, useFold } from "./section-heading";

export function KeyedRecordsSection({
  field,
  readOnly,
  actions,
}: ControlProps<MappingField>): JSX.Element {
  const disclosure = useLockDisclosure();
  const { issues, errors } = useFormContext();
  const disabling = useDisabling(field);
  const fold = useFold(field);
  const draft = useDraft();
  const template = field.entryTemplate;
  const keys = field.children.map((child) => child.key);
  const drafted =
    template !== null && draft.key !== null && !keys.includes(draft.key)
      ? placeField(template, [...field.path, draft.key], [...field.identity, draft.key])
      : null;
  const entries = field.children.map((child) => (
    <FieldView
      key={child.key}
      field={child}
      actions={<EntryActions entry={child} readOnly={readOnly} />}
    />
  ));
  if (drafted !== null) {
    entries.push(
      <FieldView
        key={drafted.key}
        field={drafted}
        actions={<ActionButton label="Discard the new entry" symbol="✕" onClick={draft.close} />}
      />,
    );
  }
  const error = errors.get(field.id) ?? null;
  return (
    <section
      class="ekphrasis-group"
      data-path={field.id}
      data-kind={field.kind}
      data-folded={fold.folded ? true : undefined}
      data-disabled={forbidsItself(field, disabling) ? true : undefined}
    >
      <SectionHeading field={field} fold={fold} disclosure={disclosure} actions={actions} />
      <LockNote field={field} disclosure={disclosure} />
      <DisabledNote field={field} constraint={disabling} />
      {error !== null && (
        <div class="ekphrasis-commit-error" role="alert">
          {error}
        </div>
      )}
      <IssueList issues={issues.at(field.id)} />
      {!fold.folded && (
        <div class="ekphrasis-group-body">
          {entries}
          {entries.length === 0 && <div class="ekphrasis-empty">No entries.</div>}
          <ExtraEntries entries={field.extraEntries} />
          <KeyAdder
            keys={keys}
            disabled={readOnly || template === null || drafted !== null}
            onAdd={draft.open}
          />
        </div>
      )}
    </section>
  );
}
