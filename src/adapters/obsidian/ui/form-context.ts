/**
 * Context shared by the components of one form: the registry of controls, and whether the form
 * accepts edits.
 */
import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { ControlRegistry } from "./control-registry";

export interface FormContextValue {
  readonly registry: ControlRegistry;
  readonly readOnly: boolean;
}

export const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext(): FormContextValue {
  const value = useContext(FormContext);
  if (value === null) throw new Error("A field component was rendered outside a form.");
  return value;
}
