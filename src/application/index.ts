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
  CheckerContext,
  CustomCheckerCall,
  CustomCheckerContext,
  CustomCheckerIssue,
  CustomCheckerItem,
  CustomCheckerRegistration,
  CustomCheckerRunner,
  GeneratedViewRunner,
  InstanceValidator,
  InstanceStore,
  LinkFormatter,
  LocatedCheckerIssue,
  RecordIdentifiers,
  ResourceMapping,
  SchemaLoader,
  SchemaResources,
  SchemaValidator,
} from "./protocols";
export { FINDINGS_LOG_CHECKER, SOURCE_STATE_CHECKER } from "./protocols";
export {
  COMMIT_DELAY_LIMITS,
  CUSTOM_CHECKER_TIMEOUT_LIMITS,
  DEFAULT_SETTINGS,
  completeCustomCheckers,
  parseSettings,
  resolveCustomCheckerModules,
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
export { CustomCheckerService } from "./custom-checker-service";
export { IdentifierIndexService } from "./identifier-index-service";
export { BindingService } from "./binding-service";
export { RegistryReader, type RegistryState, type RegistryStateDefect } from "./registry-reader";
export {
  InstanceCreationError,
  InstanceCreationService,
  type CreatedInstance,
  type CreatableSchema,
} from "./instance-creation-service";
export {
  fieldLinkByIdentifier,
  fieldLinkByPath,
  linkTextOf,
  type FieldLinkText,
} from "./field-link-text";
export {
  runSetupDiagnostic,
  type SetupDiagnosticDependencies,
} from "./diagnostic/setup-diagnostic";
export type { OpenedRecord } from "./diagnostic/record-checks";
export {
  CHECK_STATUSES,
  CONSEQUENCES,
  groupChecks,
  reportText,
  statusCounts,
  type CheckStatus,
  type Consequence,
  type DiagnosticCheck,
  type DiagnosticReport,
} from "./diagnostic/report";
export {
  commandTarget,
  timeoutVerdict,
  QUEUED_CALL_FACTOR,
  type CommandTarget,
} from "./diagnostic/checker-command";
export type {
  CheckerCallRun,
  CommandReport,
  CommandRequest,
  CommandRun,
  ImportResult,
  ImportTarget,
  InterpreterFile,
  PackageData,
  ProbeOutcome,
  PythonEnvironment,
  PythonProbe,
  VaultInspector,
  WriteAccess,
} from "./diagnostic/ports";
