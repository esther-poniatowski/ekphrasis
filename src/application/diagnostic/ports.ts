/**
 * Ports of the setup diagnostic. Each port only reads: the vault inspector asks the host about
 * files and permissions, and the Python probe starts the configured interpreter on a program
 * that imports, lists or runs, and writes nothing.
 */
import type {
  CustomCheckerCall,
  CustomCheckerIssue,
  CustomCheckerRegistration,
} from "../protocols";

/** Permission of the operating system to write an existing file, as the save of a form needs. */
export type WriteAccess =
  | { readonly status: "writable" }
  /** The operating system refuses the write; `reason` names its error, such as `EACCES`. */
  | { readonly status: "denied"; readonly reason: string }
  /** The host exposes no permission, as on the mobile app; `reason` says why. */
  | { readonly status: "unknown"; readonly reason: string };

/** Read-only view of the vault, through the same host interface as the reads and saves of forms. */
export interface VaultInspector {
  /** Whether Obsidian indexes a file at the vault path `path`, as a save requires. */
  isIndexedFile(path: string): boolean;
  /** Whether Obsidian indexes a folder at `path`, so that it reports the changes of its files. */
  isIndexedFolder(path: string): boolean;
  /** Whether a file or folder exists at `path`, indexed or not. */
  exists(path: string): Promise<boolean>;
  /** Time of the last modification of the file at `path`, in milliseconds, or `null`. */
  modifiedAt(path: string): Promise<number | null>;
  /** Permission to write the existing file at `path`, tested without writing. */
  writeAccess(path: string): Promise<WriteAccess>;
}

/** State of the file named as the Python interpreter. */
export type InterpreterFile =
  | { readonly status: "executable" }
  | { readonly status: "missing" }
  | { readonly status: "not-file" }
  | { readonly status: "not-executable"; readonly reason: string };

/** Outcome of one request of the probe. */
export type ProbeOutcome<T> =
  | { readonly status: "answered"; readonly result: T; readonly durationMs: number }
  /** The probe ran and Python raised `error` while answering. */
  | { readonly status: "failed"; readonly error: string; readonly stderr: string }
  /** The interpreter did not start; `code` is the error of the system, such as `ENOENT`. */
  | { readonly status: "launch-failed"; readonly code: string; readonly message: string }
  /** The interpreter started but wrote no answer of the probe. */
  | {
      readonly status: "invalid-response";
      readonly exitCode: number | null;
      readonly output: string;
      readonly stderr: string;
    }
  | { readonly status: "timed-out"; readonly afterMs: number };

export interface PythonEnvironment {
  readonly version: string;
  readonly executable: string;
}

/**
 * What a checker needs from the interpreter: a module to import, by name or by file path, with
 * the attribute that must be callable; the module that a command runs by `-m`, located without
 * running it after its top-level package imports; or a script of a command, which must exist and
 * is never run.
 */
export type ImportTarget =
  | { readonly kind: "module"; readonly module: string; readonly attribute?: string }
  | { readonly kind: "entry"; readonly module: string }
  | { readonly kind: "script"; readonly path: string };

export interface ImportResult {
  /** Module name, module file or script path, as the target names it. */
  readonly target: string;
  /** `null` when the module and its attribute import, else the Python error. */
  readonly error: string | null;
  /** File of the imported module, when Python reports one. */
  readonly origin: string | null;
  readonly durationMs: number;
}

/** Data files of an installed package, each opened and read once. */
export interface PackageData {
  readonly package: string;
  /** Folder of the package, or `null` when it holds no files on disk. */
  readonly root: string | null;
  readonly readable: number;
  readonly unreadable: readonly { readonly path: string; readonly error: string }[];
}

/** Configured command run once, as the built-in findings route runs it. */
export interface CommandRequest {
  readonly command: readonly string[];
  /** Working directory, with `{file}` and `{folder}` expanded by the runner code. */
  readonly root: string;
  /** Absolute path of the checked file. */
  readonly file: string;
  /** Bound on the duration of the run, after which the probe stops the command. */
  readonly capMs: number;
}

/** What the command wrote on its standard output, read as a findings log. */
export type CommandReport =
  | { readonly kind: "empty" }
  | { readonly kind: "invalid-json"; readonly excerpt: string }
  | { readonly kind: "not-sarif"; readonly reason: string }
  | {
      readonly kind: "sarif";
      readonly runs: number;
      readonly results: number;
      /** Results lacking a field that the issue transport reads, with the fields missing. */
      readonly defects: readonly { readonly index: number; readonly missing: readonly string[] }[];
      /** Issues on the checked file, as a validation would receive them. */
      readonly issues: readonly CustomCheckerIssue[];
      /** Error of the conversion of the log into issues, when it failed. */
      readonly conversionError: string | null;
    };

export interface CommandRun {
  readonly timedOut: boolean;
  readonly durationMs: number;
  readonly exitCode: number | null;
  /** End of the error output of the command. */
  readonly stderr: string;
  readonly report: CommandReport;
}

/** Result of one call of a registered function, as a validation makes it. */
export interface CheckerCallRun {
  readonly durationMs: number;
  readonly issues: readonly CustomCheckerIssue[];
}

/** Probe of the configured interpreter; each request starts and ends one short process. */
export interface PythonProbe {
  inspectInterpreter(path: string): Promise<InterpreterFile>;
  environment(interpreter: string): Promise<ProbeOutcome<PythonEnvironment>>;
  imports(
    interpreter: string,
    cwd: string | null,
    targets: readonly ImportTarget[],
  ): Promise<ProbeOutcome<readonly ImportResult[]>>;
  packageData(
    interpreter: string,
    cwd: string | null,
    name: string,
  ): Promise<ProbeOutcome<PackageData>>;
  runCommand(interpreter: string, request: CommandRequest): Promise<ProbeOutcome<CommandRun>>;
  callChecker(
    interpreter: string,
    registration: CustomCheckerRegistration,
    call: CustomCheckerCall,
    capMs: number,
  ): Promise<ProbeOutcome<CheckerCallRun>>;
}
