/**
 * Context shared by the components of one form: the registry of controls, the commits of values
 * and of structural edits, the confirmation of a loss of values, the commit delay, the reasons of the refused commits, the issues of
 * validation, the constraints of the conditional rules, and the folded state of the sections.
 */
import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { Commit, ConstraintIndex, IssueIndex, ScalarValue, YamlPath } from "../../../domain";
import type { ControlRegistry } from "./control-registry";
import type { FoldState } from "./fold-state";

/** Switch of alternative waiting for a confirmation, since it would remove filled values. */
export interface LossRequest {
  /** Title of the chosen alternative. */
  readonly alternative: string;
  /** Labels of the fields whose values would be removed. */
  readonly fields: readonly string[];
}

export interface FormContextValue {
  readonly registry: ControlRegistry;
  /** Commits `value` at the field of path `path`; the value `null` clears the field. */
  readonly commit: (path: YamlPath, value: ScalarValue) => void;
  /** Commits a structural edit: an item inserted, removed or moved, or an entry removed. */
  readonly edit: (commit: Commit) => void;
  /**
   * Commits the structural edits `commits` as one change, written only when every edit is, and
   * returns whether the text now holds them.
   */
  readonly editAll: (commits: readonly Commit[]) => boolean;
  /** Asks the author to confirm `request`, resolved to `true` when the author confirms. */
  readonly confirmLoss: (request: LossRequest) => Promise<boolean>;
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
