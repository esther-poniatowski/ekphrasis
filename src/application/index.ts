/**
 * Public interface of the application layer.
 *
 * The application layer depends on the domain layer only; outer capabilities are consumed
 * through the ports declared in `protocols`.
 */
export type { DocumentEditor, DocumentParser, FileSource, SchemaLoader } from "./protocols";
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
  type CommitOutcome,
  type SessionHost,
  type SessionSnapshot,
} from "./instance-session";
