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
export { fieldChain } from "./form/navigation";
export { placeField } from "./form/templates";
export { ItemIdentities, type ItemChange, type SequenceIdentifiers } from "./form/item-identities";
export * from "./edit/scalar-style";
export * from "./edit/source-edit";
export { valueFromText } from "./edit/input-value";
export { expectedTree, sameContent, type CommitEffect } from "./edit/expected-tree";
export {
  planCommit,
  REFUSALS,
  type Commit,
  type CommitPlan,
  type EntryRemoval,
  type ItemInsertion,
  type ItemMove,
  type ItemRemoval,
  type ScalarCommit,
  type SequenceChange,
} from "./edit/commit-plan";
export {
  validatorDocuments,
  documentUri,
  type ValidatorDocument,
} from "./schema/validator-documents";
export { UnfilledValues, jsonEquals } from "./validation/unfilled";
export { InstanceData, instanceValue, pruneUnfilled } from "./validation/instance-data";
export {
  IssueIndex,
  issue,
  markOf,
  MISSING_MESSAGE,
  type Issue,
  type IssueMark,
  type Severity,
} from "./validation/issues";
export {
  issuesFromValidatorErrors,
  pathOfPointer,
  type ValidatorError,
} from "./validation/validator-errors";
export {
  NO_HOST,
  RuleDeclarationError,
  type Checker,
  type CheckerEnvironment,
  type Constraint,
} from "./validation/rules/declaration";
export { ConstraintIndex } from "./validation/constraints";
export { checkRules, PREDEFINED_CHECKERS, type RuleReport } from "./validation/rules/run";
export { undeclaredRequirements } from "./validation/undeclared-requirements";
export { admittedUnfilledValues } from "./validation/admitted-unfilled";
