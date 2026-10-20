/**
 * Context shared by the components of one form: the registry of controls, the commits of values
 * and of structural edits, the commit delay, the reasons of the refused commits, the issues of
 * validation, the constraints of the conditional rules, and the folded state of the sections.
 */
import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { Commit, ConstraintIndex, IssueIndex, ScalarValue, YamlPath } from "../../../domain";
import type { ControlRegistry } from "./control-registry";
import type { FoldState } from "./fold-state";

export interface FormContextValue {
  readonly registry: ControlRegistry;
  /** Commits `value` at the field of path `path`; the value `null` clears the field. */
  readonly commit: (path: YamlPath, value: ScalarValue) => void;
  /** Commits a structural edit: an item inserted, removed or moved, or an entry removed. */
  readonly edit: (commit: Commit) => void;
  /** Pause of typing, in milliseconds, after which a text control commits. */
  readonly commitDelay: number;
  /** Reasons of the refused commits, by printed field path. */
  readonly errors: ReadonlyMap<string, string>;
  /** Issues of the instance, placed at their fields. */
  readonly issues: IssueIndex;
  /** Fields required or forbidden by the conditional rules under the current values. */
  readonly constraints: ConstraintIndex;
  readonly folds: FoldState;
}

export const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext(): FormContextValue {
  const value = useContext(FormContext);
  if (value === null) throw new Error("A field component was rendered outside a form.");
  return value;
}
