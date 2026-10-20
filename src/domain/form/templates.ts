/**
 * Placement of an absent template, such as the new entry of a mapping keyed by identifiers, at
 * the path of the field that it stands for.
 */
import type { YamlPath } from "../model";
import { printFieldPath } from "../paths/field-path";
import type { Field } from "./model";

/**
 * Copy of the template `template` and of its descendants, moved to the path `path` and to the
 * identity `identity`. The moved field is labelled by its key when the template has no label.
 */
export function placeField(template: Field, path: YamlPath, identity: readonly string[]): Field {
  const pathStart = template.path.length;
  const identityStart = template.identity.length;
  const move = (field: Field): Field => {
    const fieldPath = [...path, ...field.path.slice(pathStart)];
    const fieldIdentity = [...identity, ...field.identity.slice(identityStart)];
    const base = {
      path: fieldPath,
      id: printFieldPath(fieldPath),
      identity: fieldIdentity,
      uid: printFieldPath(fieldIdentity),
      key: fieldIdentity.at(-1) ?? "",
    };
    if ("children" in field) {
      return {
        ...field,
        ...base,
        children: field.children.map(move),
        alternativeChildren: field.alternativeChildren.map((fields) => fields.map(move)),
        entryTemplate: field.entryTemplate === null ? null : move(field.entryTemplate),
      };
    }
    if ("items" in field) {
      return {
        ...field,
        ...base,
        items: field.items.map(move),
        next: field.next === null ? null : move(field.next),
      };
    }
    return { ...field, ...base };
  };
  const placed = move(template);
  return template.label === "" ? { ...placed, label: String(path.at(-1) ?? "") } : placed;
}
