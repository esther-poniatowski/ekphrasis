/**
 * Persistent Python process for custom checkers. Requests carry identifiers so several calls can
 * be pending while stdout arrives in arbitrary chunks; each response settles its own promise.
 *
 * A forced stop, after a timeout, a restart or a close with pending work, stops the process tree
 * of the runner: the commands that its calls started and their descendants stop with it.
 */
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type {
  CustomCheckerCall,
  CustomCheckerContext,
  CustomCheckerIssue,
  CustomCheckerItem,
  CustomCheckerRegistration,
  CustomCheckerRunner,
} from "../../application";
import { EkphrasisError } from "../../errors";
import { stopTree, treeRootOptions } from "./process-tree";
import { PYTHON_CHECKER_RUNNER } from "./runner-script";

interface PendingResponse {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

interface ProcessResponse {
  readonly id: number;
  readonly ok: boolean;
  readonly result?: unknown;
  readonly error?: string;
}

/** Expected failure to start, communicate with, or receive a valid result from Python. */
export class CheckerProcessError extends EkphrasisError {
  override name = "CheckerProcessError";
}

export class PythonCheckerProcess implements CustomCheckerRunner {
  private process: ChildProcessWithoutNullStreams | null = null;
  private starting: Promise<void> | null = null;
  private nextId = 1;
  private output = "";
  private errors = "";
  private readonly pending = new Map<number, PendingResponse>();

  constructor(
    private readonly interpreter: string,
    private readonly registrations: readonly CustomCheckerRegistration[],
    private readonly timeoutMs: number,
  ) {}

  /** Invoke one registered checker, starting and registering the process on the first call. */
  async call(input: CustomCheckerCall): Promise<readonly CustomCheckerItem[]> {
    await this.ensureStarted();
    const result = await this.exchange(
      { type: "call", ...input },
      `Custom checker \`${input.checker}\``,
    );
    return checkerItems(result);
  }

  /** Stop the process tree immediately so the next call imports every registered module again. */
  async restart(): Promise<void> {
    await this.stop(true, "Python checker process restarted");
  }

  /** Close an idle process cleanly; stop the tree of a busy process so unload cannot hang. */
  async close(): Promise<void> {
    await this.stop(this.pending.size > 0, "Python checker process closed");
  }

  private async stop(force: boolean, reason: string): Promise<void> {
    const child = this.process;
    if (child === null) return;
    const closed = new Promise<void>((resolve) => child.once("close", () => resolve()));
    this.fail(child, this.processError(reason));
    if (force) stopTree(child);
    else child.stdin.end();
    await closed;
  }

  private async ensureStarted(): Promise<void> {
    if (this.starting !== null) {
      await this.starting;
      return;
    }
    if (this.process !== null) return;
    const starting = this.start();
    this.starting = starting;
    try {
      await starting;
    } finally {
      if (this.starting === starting) this.starting = null;
    }
  }

  private async start(): Promise<void> {
    const { spawn } = await import("node:child_process");
    const child = spawn(this.interpreter, ["-u", "-c", PYTHON_CHECKER_RUNNER], {
      stdio: "pipe",
      ...treeRootOptions(),
    });
    this.process = child;
    this.output = "";
    this.errors = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => this.readOutput(child, chunk));
    child.stderr.on("data", (chunk: string) => {
      this.errors = (this.errors + chunk).slice(-8192);
    });
    child.on("error", (error) => this.fail(child, this.processError(error.message)));
    child.on("close", (code, signal) => {
      const suffix = signal === null ? `code ${String(code)}` : `signal ${signal}`;
      this.fail(child, this.processError(`Python checker process exited with ${suffix}`));
    });
    try {
      await this.exchange(
        { type: "register", checkers: this.registrations },
        "Python checker registration",
      );
    } catch (error) {
      child.stdin.end();
      throw error;
    }
  }

  private exchange(
    message: Readonly<Record<string, unknown>>,
    operation: string,
  ): Promise<unknown> {
    const child = this.process;
    if (child === null) {
      return Promise.reject(this.processError("Python checker process is not running"));
    }
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.expire(child, id, operation), this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      child.stdin.write(`${JSON.stringify({ id, ...message })}\n`, (error) => {
        if (error !== null && error !== undefined) {
          this.deletePending(id);
          reject(this.processError(error.message));
        }
      });
    });
  }

  private expire(child: ChildProcessWithoutNullStreams, id: number, operation: string): void {
    if (this.process !== child || !this.pending.has(id)) return;
    const error = this.processError(`${operation} exceeded its ${this.timeoutMs} ms timeout`);
    this.fail(child, error);
    stopTree(child);
  }

  private readOutput(child: ChildProcessWithoutNullStreams, chunk: string): void {
    if (this.process !== child) return;
    this.output += chunk;
    for (;;) {
      const boundary = this.output.indexOf("\n");
      if (boundary < 0) return;
      const line = this.output.slice(0, boundary);
      this.output = this.output.slice(boundary + 1);
      if (line !== "") this.readResponse(child, line);
    }
  }

  private readResponse(child: ChildProcessWithoutNullStreams, line: string): void {
    if (this.process !== child) return;
    let response: ProcessResponse;
    try {
      const parsed: unknown = JSON.parse(line);
      if (!isProcessResponse(parsed)) throw new Error("response has an invalid shape");
      response = parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.rejectPending(this.processError(`Invalid response from Python: ${message}`));
      return;
    }
    const pending = this.pending.get(response.id);
    if (pending === undefined) return;
    this.deletePending(response.id);
    if (response.ok) pending.resolve(response.result);
    else pending.reject(this.processError(response.error ?? "Python checker failed"));
  }

  private fail(child: ChildProcessWithoutNullStreams, error: CheckerProcessError): void {
    if (this.process !== child) return;
    this.process = null;
    this.rejectPending(error);
  }

  private rejectPending(error: CheckerProcessError): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  private deletePending(id: number): void {
    const pending = this.pending.get(id);
    if (pending === undefined) return;
    clearTimeout(pending.timer);
    this.pending.delete(id);
  }

  private processError(message: string): CheckerProcessError {
    const detail = this.errors.trim();
    const suffix = detail === "" ? "" : `: ${detail}`;
    return new CheckerProcessError(`${message} [${this.interpreter}]${suffix}`);
  }
}

function isProcessResponse(value: unknown): value is ProcessResponse {
  if (typeof value !== "object" || value === null) return false;
  const response = value as Record<string, unknown>;
  return (
    Number.isInteger(response["id"]) &&
    typeof response["ok"] === "boolean" &&
    (response["error"] === undefined || typeof response["error"] === "string")
  );
}

/**
 * Issues returned by a checker, as the transport admits them.
 *
 * @throws CheckerProcessError When `value` is no list of strings and located issues.
 */
export function checkerItems(value: unknown): readonly CustomCheckerItem[] {
  if (!Array.isArray(value) || !value.every(isCheckerItem)) {
    throw new CheckerProcessError(
      "Custom checker returned a value other than a list of issues and context items",
    );
  }
  return value;
}

/** Issues among the returned checker items, for consumers that do not display checker context. */
export function checkerIssues(value: unknown): readonly CustomCheckerIssue[] {
  return checkerItems(value).filter((item): item is CustomCheckerIssue => !isCheckerContext(item));
}

/** Keys of a located issue that hold a location: at least one must be present. */
const LOCATION_KEYS = ["path", "pointer", "locus"] as const;

/** Optional keys of a located issue, each a string when present. */
const OPTIONAL_KEYS = [
  ...LOCATION_KEYS,
  "discriminator",
  "controlled_by",
  "rule",
  "result_class",
  "repair_condition",
  "documentation_target",
  "source_file",
] as const;

function isCheckerIssue(value: unknown): value is CustomCheckerIssue {
  if (typeof value === "string") return true;
  if (typeof value !== "object" || value === null) return false;
  const issue = value as Record<string, unknown>;
  return (
    typeof issue["message"] === "string" &&
    (issue["severity"] === "error" || issue["severity"] === "warning") &&
    LOCATION_KEYS.some((key) => issue[key] !== undefined) &&
    OPTIONAL_KEYS.every((key) => issue[key] === undefined || typeof issue[key] === "string")
  );
}

function isCheckerItem(value: unknown): value is CustomCheckerItem {
  return isCheckerIssue(value) || isCheckerContext(value);
}

function isCheckerContext(value: unknown): value is CustomCheckerContext {
  if (typeof value !== "object" || value === null) return false;
  const context = value as Record<string, unknown>;
  return (
    context["kind"] === "context" &&
    typeof context["label"] === "string" &&
    typeof context["value"] === "string" &&
    ["description", "result_class", "documentation_target"].every(
      (key) => context[key] === undefined || typeof context[key] === "string",
    )
  );
}
