/**
 * Public interface of the application layer.
 *
 * The application layer depends on the domain layer only; outer capabilities are consumed
 * through the ports declared in `protocols`.
 */
export type {
  DocumentEditor,
  BindingResolver,
  DocumentParser,
  FileSource,
  InstanceValidator,
  LinkFormatter,
  RecordIdentifiers,
  SchemaLoader,
  SchemaValidator,
} from "./protocols";
export {
  COMMIT_DELAY_LIMITS,
  DEFAULT_SETTINGS,
  parseSettings,
  type EkphrasisSettings,
} from "./settings";
export { FormService, type FormReady, type FormState } from "./form-service";
export { CommitService, UNCONFIRMED, type CommitResult } from "./commit-service";
export {
  InstanceSession,
  STRUCTURE_WAITS,
  type CommitOutcome,
  type SessionHost,
  type SessionSnapshot,
} from "./instance-session";
export { ValidationService, type ValidationReport } from "./validation-service";
export { IdentifierIndexService } from "./identifier-index-service";
export { BindingService } from "./binding-service";
export {
  fieldLinkByIdentifier,
  fieldLinkByPath,
  linkTextOf,
  type FieldLinkText,
} from "./field-link-text";
