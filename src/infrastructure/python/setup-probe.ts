/**
 * Implementation of the port `PythonProbe`: each request starts the configured interpreter on the
 * probe program, writes one JSON request on its standard input, and reads one JSON answer from
 * its standard output. A request that exceeds its bound stops its process, so the diagnostic
 * leaves no probe running.
 */
import type {
  CheckerCallRun,
  CommandReport,
  CommandRequest,
  CommandRun,
  CustomCheckerCall,
  CustomCheckerIssue,
  CustomCheckerRegistration,
  ImportResult,
  ImportTarget,
  InterpreterFile,
  PackageData,
  ProbeOutcome,
  PythonEnvironment,
  PythonProbe,
} from "../../application";
import { checkerIssues } from "./checker-process";
import { PYTHON_SETUP_PROBE } from "./probe-script";

/** Bound of a request that imports or lists, which never runs a configured command. */
export const PROBE_TIMEOUT_MS = 60_000;

/** Time left to the probe beyond the bound of its command, to stop it and answer. */
const COMMAND_GRACE_MS = 5_000;

export class PythonSetupProbe implements PythonProbe {
  constructor(
    /** Environment of the probe process; the variables of Obsidian by default. */
    private readonly environmentVariables: Readonly<
      Record<string, string | undefined>
    > = process.env,
  ) {}

  async inspectInterpreter(path: string): Promise<InterpreterFile> {
    const { access, stat, constants } = await import("node:fs/promises");
    let isDirectory: boolean;
    try {
      isDirectory = (await stat(path)).isDirectory();
    } catch {
      return { status: "missing" };
    }
    if (isDirectory) return { status: "not-file" };
    try {
      await access(path, constants.X_OK);
      return { status: "executable" };
    } catch (error) {
      return { status: "not-executable", reason: errorCode(error) };
    }
  }

  environment(interpreter: string): Promise<ProbeOutcome<PythonEnvironment>> {
    return this.request(interpreter, null, { type: "environment" }, PROBE_TIMEOUT_MS, (raw) => {
      const answer = record(raw);
      return { version: text(answer["version"]), executable: text(answer["executable"]) };
    });
  }

  imports(
    interpreter: string,
    cwd: string | null,
    targets: readonly ImportTarget[],
  ): Promise<ProbeOutcome<readonly ImportResult[]>> {
    return this.request(interpreter, cwd, { type: "imports", targets }, PROBE_TIMEOUT_MS, (raw) =>
      list(raw).map((item) => {
        const result = record(item);
        return {
          target: text(result["target"]),
          error: optionalText(result["error"]),
          origin: optionalText(result["origin"]),
          durationMs: number(result["duration_ms"]),
        };
      }),
    );
  }

  packageData(
    interpreter: string,
    cwd: string | null,
    name: string,
  ): Promise<ProbeOutcome<PackageData>> {
    return this.request(
      interpreter,
      cwd,
      { type: "package-data", package: name },
      PROBE_TIMEOUT_MS,
      (raw) => {
        const answer = record(raw);
        return {
          package: text(answer["package"]),
          root: optionalText(answer["root"]),
          readable: number(answer["readable"]),
          unreadable: list(answer["unreadable"]).map((item) => {
            const entry = record(item);
            return { path: text(entry["path"]), error: text(entry["error"]) };
          }),
        };
      },
    );
  }

  runCommand(interpreter: string, request: CommandRequest): Promise<ProbeOutcome<CommandRun>> {
    const message = {
      type: "command",
      command: request.command,
      root: request.root,
      file: request.file,
      cap_ms: request.capMs,
    };
    return this.request(interpreter, null, message, request.capMs + COMMAND_GRACE_MS, (raw) => {
      const answer = record(raw);
      return {
        timedOut: answer["timed_out"] === true,
        durationMs: number(answer["duration_ms"]),
        exitCode: answer["exit_code"] === null ? null : number(answer["exit_code"]),
        stderr: text(answer["stderr"]),
        report: commandReport(answer["report"]),
      };
    });
  }

  callChecker(
    interpreter: string,
    registration: CustomCheckerRegistration,
    call: CustomCheckerCall,
    capMs: number,
  ): Promise<ProbeOutcome<CheckerCallRun>> {
    return this.request(interpreter, null, { type: "call", registration, call }, capMs, (raw) => {
      const answer = record(raw);
      return { durationMs: number(answer["duration_ms"]), issues: checkerIssues(answer["result"]) };
    });
  }

  /** Runs the probe on one request, answered by `convert` applied to its result. */
  private async request<T>(
    interpreter: string,
    cwd: string | null,
    message: Readonly<Record<string, unknown>>,
    limitMs: number,
    convert: (raw: unknown) => T,
  ): Promise<ProbeOutcome<T>> {
    const { spawn } = await import("node:child_process");
    const directory = cwd !== null && (await isDirectory(cwd)) ? cwd : undefined;
    const started = Date.now();
    return new Promise((resolve) => {
      let settled = false;
      const settle = (outcome: ProbeOutcome<T>): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(outcome);
      };
      const child = spawn(interpreter, ["-B", "-c", PYTHON_SETUP_PROBE], {
        cwd: directory,
        env: { ...this.environmentVariables, PYTHONDONTWRITEBYTECODE: "1" },
        stdio: "pipe",
      });
      let output = "";
      let errors = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => (output += chunk));
      child.stderr.on("data", (chunk: string) => (errors = (errors + chunk).slice(-8192)));
      const timer = setTimeout(() => {
        child.kill();
        settle({ status: "timed-out", afterMs: limitMs });
      }, limitMs);
      child.on("error", (error) =>
        settle({ status: "launch-failed", code: errorCode(error), message: error.message }),
      );
      child.on("close", (code) => {
        const line = output.trim().split("\n").pop() ?? "";
        let answer: Record<string, unknown>;
        try {
          answer = record(JSON.parse(line));
        } catch {
          settle({
            status: "invalid-response",
            exitCode: code,
            output: output.slice(-2000),
            stderr: errors,
          });
          return;
        }
        if (answer["ok"] !== true) {
          settle({ status: "failed", error: text(answer["error"]), stderr: errors });
          return;
        }
        try {
          settle({
            status: "answered",
            result: convert(answer["result"]),
            durationMs: Date.now() - started,
          });
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          settle({ status: "failed", error: reason, stderr: errors });
        }
      });
      child.stdin.on("error", () => undefined);
      child.stdin.end(`${JSON.stringify(message)}\n`);
    });
  }
}

async function isDirectory(path: string): Promise<boolean> {
  const { stat } = await import("node:fs/promises");
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

function commandReport(raw: unknown): CommandReport {
  const report = record(raw);
  switch (report["kind"]) {
    case "empty":
      return { kind: "empty" };
    case "invalid-json":
      return { kind: "invalid-json", excerpt: text(report["excerpt"]) };
    case "not-sarif":
      return { kind: "not-sarif", reason: text(report["reason"]) };
    case "sarif": {
      let issues: readonly CustomCheckerIssue[];
      let conversionError = optionalText(report["conversion_error"]);
      try {
        issues = checkerIssues(report["issues"]);
      } catch (error) {
        issues = [];
        conversionError ??= error instanceof Error ? error.message : String(error);
      }
      return {
        kind: "sarif",
        runs: number(report["runs"]),
        results: number(report["results"]),
        defects: list(report["defects"]).map((item) => {
          const defect = record(item);
          return { index: number(defect["index"]), missing: list(defect["missing"]).map(text) };
        }),
        issues,
        conversionError,
      };
    }
    default:
      throw new Error("the probe returned a report of no known kind");
  }
}

function errorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : error instanceof Error ? error.message : String(error);
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("the probe returned a value other than an object");
  }
  return value as Record<string, unknown>;
}

function list(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error("the probe returned a value other than a list");
  return value;
}

function text(value: unknown): string {
  if (typeof value !== "string") throw new Error("the probe returned a value other than text");
  return value;
}

function optionalText(value: unknown): string | null {
  return value === null || value === undefined ? null : text(value);
}

function number(value: unknown): number {
  if (typeof value !== "number") throw new Error("the probe returned a value other than a number");
  return value;
}
