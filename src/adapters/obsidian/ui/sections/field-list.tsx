/**
 * Fields of a mapping, followed by its keys outside the schema.
 */
import type { JSX } from "preact";
import type { MappingField } from "../../../../domain";
import { FieldView } from "../field-view";
import { ExtraEntries } from "./extra-entries";

export function FieldList({ field }: { readonly field: MappingField }): JSX.Element {
  return (
    <>
      {field.children.map((child) => (
        <FieldView key={child.id} field={child} />
      ))}
      <ExtraEntries entries={field.extraEntries} />
    </>
  );
}
