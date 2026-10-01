/**
 * Traversal of form models, for tests.
 */
import type { Field } from "../../src/domain";

/** Every field of the tree rooted at `field`, in display order, `field` included. */
export function allFields(field: Field): Field[] {
  const children =
    "children" in field ? field.children : "items" in field ? field.items : ([] as Field[]);
  return [field, ...children.flatMap(allFields)];
}

/** Field of printed path `id` in the tree rooted at `root`. */
export function fieldAt(root: Field, id: string): Field {
  const field = allFields(root).find((candidate) => candidate.id === id);
  if (field === undefined) throw new Error(`No field at "${id}".`);
  return field;
}
