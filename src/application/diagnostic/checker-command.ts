/**
 * Pure rules of the checker route: the code that a configured command runs, the command line
 * that a researcher can copy into a terminal, and the comparison of a measured duration with the
 * configured timeout.
 */
import type { JsonValue } from "../../domain";
import { FINDINGS_LOG_CHECKER, type CustomCheckerRegistration } from "../protocols";
import { CUSTOM_CHECKER_TIMEOUT_LIMITS } from "../settings";

/** Code that the interpreter runs for a command: a module by `-m`, a script, or inline code. */
export type CommandTarget =
  | { readonly kind: "module"; readonly name: string }
  | { readonly kind: "script"; readonly path: string }
  | { readonly kind: "code" }
  | { readonly kind: "none" };

/** Interpreter options that take the next argument as their value. */
const OPTIONS_WITH_VALUE = new Set(["-W", "-X", "--check-hash-based-pycs"]);

/** Target of the arguments `command` given to the interpreter, as Python reads them. */
export function commandTarget(command: readonly string[]): CommandTarget {
  for (let index = 0; index < command.length; index += 1) {
    const argument = command[index] as string;
    if (argument === "-m") {
      const name = command[index + 1];
      return name === undefined ? { kind: "none" } : { kind: "module", name };
    }
    if (argument.startsWith("-m") && argument.length > 2) {
      return { kind: "module", name: argument.slice(2) };
    }
    if (argument === "-c" || argument.startsWith("-c")) return { kind: "code" };
    if (OPTIONS_WITH_VALUE.has(argument)) {
      index += 1;
      continue;
    }
    if (argument.startsWith("-")) continue;
    return { kind: "script", path: argument };
  }
  return { kind: "none" };
}

/** Whether `registration` names the built-in route that runs a command and reads its findings log. */
export function isFindingsRoute(registration: CustomCheckerRegistration): boolean {
  return (
    registration.module.trim() === FINDINGS_LOG_CHECKER.module &&
    registration.function.trim() === FINDINGS_LOG_CHECKER.function
  );
}

/** Arguments `command` and `root` of a findings route, or the reason they are malformed. */
export function findingsArguments(
  registration: CustomCheckerRegistration,
):
  | { readonly status: "valid"; readonly command: readonly string[]; readonly root: string }
  | { readonly status: "invalid"; readonly reason: string } {
  const args = registration.arguments ?? {};
  const command: JsonValue | undefined = args["command"];
  if (!Array.isArray(command) || command.length === 0) {
    return { status: "invalid", reason: "its arguments hold no list `command`" };
  }
  if (!command.every((part): part is string => typeof part === "string")) {
    return { status: "invalid", reason: "its argument `command` holds a value other than text" };
  }
  const root = args["root"] ?? "{folder}";
  if (typeof root !== "string") {
    return { status: "invalid", reason: "its argument `root` is not text" };
  }
  return { status: "valid", command, root };
}

/** Text of `{file}` and `{folder}` expanded for the checked file, as the runner expands them. */
export function expandPlaceholders(text: string, file: string): string {
  const folder = file.slice(0, Math.max(0, file.lastIndexOf("/")));
  return text.split("{file}").join(file).split("{folder}").join(folder);
}

/** Command line that a researcher can paste into a terminal to run the command by hand. */
export function commandLine(
  interpreter: string,
  command: readonly string[],
  file: string | null,
): string {
  const parts = [interpreter, ...command].map((part) =>
    file === null ? part : expandPlaceholders(part, file),
  );
  return parts.map(shellWord).join(" ");
}

function shellWord(word: string): string {
  return /^[\w@%+=:,./{}-]+$/.test(word) ? word : `'${word.split("'").join(`'\\''`)}'`;
}

/**
 * Number of measured durations that the timeout must cover. The process of the checkers answers
 * one call at a time, and the timeout of a call runs from its request: a validation started while
 * another call runs, as after the next pause of typing, waits for that call, then runs. Its call
 * therefore lasts twice the measured duration.
 */
export const QUEUED_CALL_FACTOR = 2;

export interface TimeoutVerdict {
  /**
   * `fail` when a single call reaches the timeout; `warning` when a call queued behind another
   * reaches it; `pass` otherwise.
   */
  readonly status: "pass" | "warning" | "fail";
  /** Timeout covering a queued call, within the admitted limits. */
  readonly recommendedMs: number;
}

/** Comparison of a measured duration with the configured timeout, both in milliseconds. */
export function timeoutVerdict(measuredMs: number, timeoutMs: number): TimeoutVerdict {
  const { min, max, step } = CUSTOM_CHECKER_TIMEOUT_LIMITS;
  const queuedMs = measuredMs * QUEUED_CALL_FACTOR;
  const recommendedMs = Math.min(max, Math.max(min, Math.ceil(queuedMs / step) * step));
  if (measuredMs >= timeoutMs) return { status: "fail", recommendedMs };
  if (queuedMs > timeoutMs) return { status: "warning", recommendedMs };
  return { status: "pass", recommendedMs };
}

/** Duration in seconds with one decimal, as the report states it. */
export function seconds(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(1)} s`;
}
