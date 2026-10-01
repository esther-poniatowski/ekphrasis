/**
 * Row of a field: its label, marked when the field is required or locked, and the content area
 * holding its control.
 */
import type { ComponentChildren, JSX } from "preact";
import type { Field } from "../../../domain";
import { FieldLabel, LockNote, useLockDisclosure } from "./field-label";

export function FieldRow({
  field,
  children,
}: {
  readonly field: Field;
  readonly children: ComponentChildren;
}): JSX.Element {
  const disclosure = useLockDisclosure();
  return (
    <div class="ekphrasis-field" data-path={field.id}>
      <FieldLabel field={field} disclosure={disclosure} />
      <div class="ekphrasis-field-content">{children}</div>
      <LockNote field={field} disclosure={disclosure} />
    </div>
  );
}
