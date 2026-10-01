/**
 * Section of a mapping field, headed by its label, holding one field per key. It displays the
 * kind `group`, and every mapping kind until its dedicated control exists.
 */
import type { JSX } from "preact";
import type { MappingField } from "../../../../domain";
import type { ControlProps } from "../control-registry";
import { FieldLabel } from "../field-label";
import { FieldList } from "./field-list";

export function GroupSection({ field }: ControlProps<MappingField>): JSX.Element {
  return (
    <section class="ekphrasis-group" data-path={field.id} data-kind={field.kind}>
      <div class="ekphrasis-group-heading">
        <FieldLabel field={field} />
      </div>
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
