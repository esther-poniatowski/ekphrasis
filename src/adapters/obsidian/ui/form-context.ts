/**
 * Context shared by the components of one form: the registry of controls, the commit of a value,
 * the commit delay, the reasons of the refused commits, the issues of validation, and the
 * constraints of the conditional rules.
 */
import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { ConstraintIndex, IssueIndex, ScalarValue, YamlPath } from "../../../domain";
import type { ControlRegistry } from "./control-registry";

export interface FormContextValue {
  readonly registry: ControlRegistry;
  /** Commits `value` at the field of path `path`; the value `null` clears the field. */
  readonly commit: (path: YamlPath, value: ScalarValue) => void;
  /** Pause of typing, in milliseconds, after which a text control commits. */
  readonly commitDelay: number;
  /** Reasons of the refused commits, by printed field path. */
  readonly errors: ReadonlyMap<string, string>;
  /** Issues of the instance, placed at their fields. */
  readonly issues: IssueIndex;
  /** Fields required or forbidden by the conditional rules under the current values. */
  readonly constraints: ConstraintIndex;
}

export const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext(): FormContextValue {
  const value = useContext(FormContext);
  if (value === null) throw new Error("A field component was rendered outside a form.");
  return value;
}
