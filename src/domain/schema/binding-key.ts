/**
 * The binding key: the root property through which a record names its contract, and whose
 * schema declares that contract as its constant. The consumer chooses the key, as its schema
 * registry does; `_schema` is the conventional key.
 */
import type { JsonScalar } from "./json";
import type { SchemaView } from "./schema-view";

/** Binding key of a consumer that names no other. */
export const DEFAULT_BINDING_KEY = "_schema";

/** Form of a binding key: a property name of letters, digits, `_` and `-`, as Kleisis admits. */
const BINDING_KEY = /^[A-Za-z_][A-Za-z0-9_-]*$/u;

/** Whether `value` can name the binding property of a record. */
export function isBindingKey(value: string): boolean {
  return BINDING_KEY.test(value);
}

/**
 * Contract that the schema `root` declares as the constant of its property `bindingKey`, or
 * `undefined` when the property or its constant is absent.
 */
export function declaredContract(
  root: SchemaView,
  bindingKey: string = DEFAULT_BINDING_KEY,
): JsonScalar | undefined {
  return root.properties().find(({ key }) => key === bindingKey)?.schema.constValue?.value;
}
