/**
 * Public interface of the domain layer.
 *
 * The domain layer depends on no other layer, on no third-party library and on no host API.
 */
export * from "./model";
export * from "./files/vault-paths";
export * from "./paths/field-path";
export * from "./binding/binding";
export { GlobPattern } from "./binding/glob";
export { readModeline } from "./binding/modeline";
export * from "./schema/json";
export { collectReferences, parseReference } from "./schema/reference";
export * from "./schema/schema-set";
export { SchemaView, type PropertySchema } from "./schema/schema-view";
export * from "./form/kinds";
export * from "./form/model";
export { buildFormModel } from "./form/builder";
