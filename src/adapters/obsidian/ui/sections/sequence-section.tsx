/**
 * Section of a sequence field, headed by its label, holding one field per item. It displays
 * every sequence kind until its dedicated control exists.
 */
import type { JSX } from "preact";
import type { SequenceField } from "../../../../domain";
import type { ControlProps } from "../control-registry";
import { FieldLabel, LockNote, useLockDisclosure } from "../field-label";
import { FieldView } from "../field-view";

export function SequenceSection({ field }: ControlProps<SequenceField>): JSX.Element {
  const disclosure = useLockDisclosure();
  return (
    <section class="ekphrasis-group" data-path={field.id} data-kind={field.kind}>
      <div class="ekphrasis-group-heading">
        <FieldLabel field={field} disclosure={disclosure} />
      </div>
      <LockNote field={field} disclosure={disclosure} />
      <div class="ekphrasis-group-body">
        {field.items.map((item) => (
          <FieldView key={item.id} field={item} />
        ))}
        {field.items.length === 0 && <div class="ekphrasis-empty">No items.</div>}
      </div>
    </section>
  );
}
