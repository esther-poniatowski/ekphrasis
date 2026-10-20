/**
 * Switch of the alternative of a field of kind `alternatives`, as the feature note on the field
 * kinds specifies: choosing another alternative removes from the file each key that belongs to
 * the previous alternative only, so the value never matches two alternatives. A key declared by
 * both alternatives stays. When a removed key holds a filled value, the switch waits for a
 * confirmation that lists the fields whose values would be lost.
 */
import type { Field, MappingField } from "../form/model";
import type { EntryRemoval } from "./commit-plan";

export interface AlternativeSwitch {
  /** Removals of the present keys of the previous alternative only, in the order of its fields. */
  readonly removals: readonly EntryRemoval[];
  /** Removed fields holding a filled value, which a confirmation lists before the switch. */
  readonly lost: readonly Field[];
}

const NO_SWITCH: AlternativeSwitch = { removals: [], lost: [] };

/**
 * Switch of the field `field` from the alternative at position `from`, the one that the form
 * displays, to the alternative at position `to`. No key is removed when either position is
 * `null`, since no alternative is then displayed or chosen.
 */
export function planAlternativeSwitch(
  field: MappingField,
  from: number | null,
  to: number | null,
): AlternativeSwitch {
  if (from === null || to === null || from === to) return NO_SWITCH;
  const previous = field.alternativeChildren[from] ?? [];
  const kept = new Set((field.alternativeChildren[to] ?? []).map((child) => child.path.at(-1)));
  const removed = previous.filter((child) => child.node !== null && !kept.has(child.path.at(-1)));
  return {
    removals: removed.map((child) => ({
      kind: "remove-entry",
      path: child.path,
      emptyAsNull: true,
    })),
    lost: removed.filter(holdsFilledValue),
  };
}

/**
 * Whether `field` holds a value whose removal loses information: a value other than the null
 * value and the unfilled values, a value of another shape than the schema declares, or a
 * collection holding such a value or a key outside the schema.
 */
function holdsFilledValue(field: Field): boolean {
  if (field.node === null || field.unfilled) return false;
  if (field.mismatch !== null) return true;
  if ("items" in field) return field.items.some(holdsFilledValue);
  if ("children" in field) {
    return field.extraEntries.length > 0 || field.children.some(holdsFilledValue);
  }
  return true;
}
