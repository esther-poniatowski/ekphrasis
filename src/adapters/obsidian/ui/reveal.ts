/**
 * Move of the form to a field, as the outline, the search of fields and the summary of issues
 * request it: the sections containing the field unfold, and once the form is displayed again,
 * the field scrolls into the middle of the view and its control takes the focus.
 */
import {
  fieldChain,
  printFieldPath,
  type Field,
  type FormModel,
  type YamlPath,
} from "../../../domain";
import { columnHelpKey } from "./help-state";

export interface RevealPlan {
  /** Printed field path of the field, which its element in the form carries. */
  readonly id: string;
  /** Identities of the groups and collections containing the field, which must unfold. */
  readonly unfold: readonly string[];
  /** Help key under which the instructions of the field display. */
  readonly helpKey: string;
}

const TABLE_KINDS: readonly string[] = ["table", "keyed-table"];

/** Plan moving the form of `model` to the field at `path`, or `null` when no field lies there. */
export function planReveal(model: FormModel, path: YamlPath): RevealPlan | null {
  const chain = fieldChain(model.root, path);
  const field = chain?.at(-1);
  if (chain === null || field === undefined) return null;
  return {
    id: printFieldPath(path),
    unfold: chain.slice(1, -1).map((container) => container.uid),
    helpKey: helpKeyOf(chain, field),
  };
}

/**
 * Help key of the last field of `chain`: the column of its table for a cell, whose instructions
 * display under the header of the table, and else the identity of the field.
 */
function helpKeyOf(chain: readonly Field[], field: Field): string {
  const table = chain.at(-3);
  if (table !== undefined && TABLE_KINDS.includes(table.kind) && chain.length >= 3) {
    return columnHelpKey(table.uid, String(field.path.at(-1)));
  }
  return field.uid;
}

/** Duration of the highlight of a field reached by a move, in milliseconds. */
const HIGHLIGHT_MS = 1500;

/**
 * Scrolls `container` to the element of the field `id`, focuses its control, and highlights it
 * briefly. A group or a collection focuses the button folding it. Returns whether the field is
 * displayed.
 */
export function revealElement(container: HTMLElement, id: string): boolean {
  const target = Array.from(container.querySelectorAll<HTMLElement>("[data-path]")).find(
    (element) => element.dataset["path"] === id,
  );
  if (target === undefined) return false;
  target.scrollIntoView({ block: "center" });
  const control = target.matches("section")
    ? target.querySelector<HTMLElement>(".ekphrasis-fold")
    : target.querySelector<HTMLElement>(".ekphrasis-control");
  control?.focus({ preventScroll: true });
  target.dataset["revealed"] = "true";
  window.setTimeout(() => delete target.dataset["revealed"], HIGHLIGHT_MS);
  return true;
}
