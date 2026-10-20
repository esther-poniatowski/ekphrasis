/**
 * Section of a sequence field, headed by its label and the count of the issues within it,
 * holding one field per item, each with the actions moving it up or down and removing it. A
 * button adds an item: the next item displays as a draft, written by its first edited value. It
 * displays the kinds `list` and `records`, and every sequence kind without a control of its own.
 */
import type { JSX } from "preact";
import type { SequenceField } from "../../../../domain";
import type { ControlProps } from "../control-registry";
import { DisabledNote, forbidsItself, useDisabling } from "../disabled-note";
import { LockNote, useLockDisclosure } from "../field-label";
import { FieldView } from "../field-view";
import { useFormContext } from "../form-context";
import { IssueList } from "../issue-list";
import { useDraft } from "./draft";
import { ActionButton, ItemActions } from "./item-actions";
import { SectionHeading, useFold } from "./section-heading";

export function SequenceSection({
  field,
  readOnly,
  actions,
}: ControlProps<SequenceField>): JSX.Element {
  const disclosure = useLockDisclosure();
  const { issues, errors } = useFormContext();
  const disabling = useDisabling(field);
  const fold = useFold(field);
  const draft = useDraft();
  const next = field.next;
  const drafted = next !== null && draft.key === next.key ? next : null;
  const count = field.items.length;
  const rows = field.items.map((item) => (
    <FieldView
      key={item.key}
      field={item}
      actions={<ItemActions item={item} count={count} readOnly={readOnly} />}
    />
  ));
  if (drafted !== null) {
    rows.push(
      <FieldView
        key={drafted.key}
        field={drafted}
        actions={<ActionButton label="Discard the new item" symbol="✕" onClick={draft.close} />}
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
          {rows}
          {rows.length === 0 && <div class="ekphrasis-empty">No items.</div>}
          <AddButton
            label="Add an item"
            disabled={readOnly || next === null || drafted !== null}
            onClick={() => (next === null ? undefined : draft.open(next.key))}
          />
        </div>
      )}
    </section>
  );
}

export function AddButton({
  label,
  disabled,
  onClick,
}: {
  readonly label: string;
  readonly disabled: boolean;
  readonly onClick: () => void;
}): JSX.Element {
  return (
    <button type="button" class="ekphrasis-add" disabled={disabled} onClick={onClick}>
      {`+ ${label}`}
    </button>
  );
}
