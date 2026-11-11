/**
 * Checks of one measured run of a checker selecting the opened record: the report that the run
 * produced, and its duration against the configured timeout.
 */
import { instanceValue, type JsonValue } from "../../domain";
import { YamlParseError } from "../../errors";
import type { CustomCheckerRegistration } from "../protocols";
import { CUSTOM_CHECKER_TIMEOUT_LIMITS } from "../settings";
import { commandLine, QUEUED_CALL_FACTOR, seconds, timeoutVerdict } from "./checker-command";
import type { CommandRun, ProbeOutcome, PythonProbe } from "./ports";
import { probeFailure } from "./probe-failure";
import type { OpenedRecord } from "./record-checks";
import { blocked, notPassed, passed, type CheckSubject, type DiagnosticCheck } from "./report";
import type { CheckerCheckDependencies } from "./checker-checks";

/** Registration ready to run, with its arguments when it follows the findings route. */
export interface Usable {
  readonly registration: CustomCheckerRegistration;
  readonly findings: { readonly command: readonly string[]; readonly root: string } | null;
}

export const REPORT_SUBJECT = {
  id: "checker.report",
  consequence: "checks",
  dependency: "Report of a measured checker run",
  affects: "custom checks of this record",
} as const satisfies CheckSubject;

/** Checks of one run of the checker of `entry` on the opened record: its report and its duration. */
export async function measuredRun(
  dependencies: CheckerCheckDependencies,
  probe: PythonProbe,
  record: OpenedRecord,
  interpreter: string,
  entry: Usable,
  file: string,
): Promise<readonly DiagnosticCheck[]> {
  const name = entry.registration.name;
  const subject: CheckSubject = {
    ...REPORT_SUBJECT,
    id: `${REPORT_SUBJECT.id}:${name}`,
    dependency: `Report of the checker \`${name}\``,
  };
  const timeoutMs = dependencies.settings.customCheckerTimeout;
  const capMs = CUSTOM_CHECKER_TIMEOUT_LIMITS.max;
  if (entry.findings !== null) {
    const { command, root } = entry.findings;
    const line = commandLine(interpreter, command, file);
    const outcome = await probe.runCommand(interpreter, {
      command,
      root,
      file,
      capMs,
    });
    const report = commandReportCheck(subject, outcome, line, capMs);
    const durationMs =
      outcome.status === "answered" && !outcome.result.timedOut ? outcome.result.durationMs : null;
    return [
      report,
      ...(durationMs === null ? [] : [durationCheck(name, durationMs, timeoutMs, true)]),
    ];
  }
  let instance: JsonValue;
  try {
    instance = instanceValue(dependencies.parser.parse(record.text));
  } catch (error) {
    if (!(error instanceof YamlParseError)) throw error;
    return [blocked(subject, "the YAML text of the opened record")];
  }
  const registration = entry.registration;
  const module = registration.module.endsWith(".py")
    ? dependencies.resolveFile(registration.module)
    : registration.module;
  const outcome = await probe.callChecker(
    interpreter,
    { ...registration, module },
    {
      checker: name,
      value: instance,
      instance,
      path: "",
      file,
      arguments: entry.registration.arguments ?? {},
    },
    capMs,
  );
  if (outcome.status !== "answered") {
    const failure = probeFailure(outcome);
    return [
      notPassed(
        "fail",
        subject,
        `The function \`${entry.registration.module}.${entry.registration.function}\` failed on the opened record: ${failure.summary}`,
        "Correct the checker function so that it returns a list of issues, then run *Restart Python checkers*.",
        failure.details,
      ),
    ];
  }
  const { durationMs, issues } = outcome.result;
  return [
    passed(
      subject,
      `The function returned a valid list of ${issues.length} ${issues.length === 1 ? "issue" : "issues"} in ${seconds(durationMs)}.`,
    ),
    durationCheck(name, durationMs, timeoutMs, false),
  ];
}

function commandReportCheck(
  subject: CheckSubject,
  outcome: ProbeOutcome<CommandRun>,
  line: string,
  capMs: number,
): DiagnosticCheck {
  const runByHand = `Run the command in a terminal to read its error: ${line}`;
  if (outcome.status !== "answered") {
    const failure = probeFailure(outcome);
    return notPassed(
      "fail",
      subject,
      `The command could not be run: ${failure.summary}`,
      runByHand,
      [line, ...failure.details],
    );
  }
  const run = outcome.result;
  const details = [
    line,
    ...(run.stderr.trim() === "" ? [] : [`Error output: ${run.stderr.trim()}`]),
  ];
  if (run.timedOut) {
    return notPassed(
      "fail",
      subject,
      `The command ran longer than ${seconds(capMs)}, the largest timeout that Ekphrasis admits, and was stopped.`,
      "Check a smaller folder, or ask the maintainers of the tool for a faster check of one file; the custom check cannot complete in a validation.",
      details,
    );
  }
  const status = `exit status ${String(run.exitCode)}`;
  const report = run.report;
  switch (report.kind) {
    case "empty":
      return notPassed(
        "fail",
        subject,
        `The command wrote nothing on its standard output (${status}), so no findings log reached Ekphrasis.`,
        `${runByHand}. The command must write a SARIF log on its standard output, often through an option such as \`--format sarif\`.`,
        details,
      );
    case "invalid-json":
      return notPassed(
        "fail",
        subject,
        `The command wrote text that is not JSON (${status}): ${report.excerpt}`,
        `${runByHand}. The command must write only a SARIF log on its standard output.`,
        details,
      );
    case "not-sarif":
      return notPassed(
        "fail",
        subject,
        `The command wrote JSON that is no SARIF 2.1.0 log: ${report.reason}.`,
        "Select the output format of the tool that writes SARIF 2.1.0, such as `--format sarif`.",
        details,
      );
    case "sarif":
      break;
  }
  if (report.conversionError !== null) {
    return notPassed(
      "fail",
      subject,
      `The SARIF log could not be converted into issues: ${report.conversionError}`,
      "Copy the report for the maintainers of the tool and of Ekphrasis.",
      details,
    );
  }
  if (report.defects.length > 0) {
    const lines = report.defects.map(
      ({ index, missing }) => `result ${index}: lacks ${missing.join(", ")}`,
    );
    return notPassed(
      "fail",
      subject,
      `${report.defects.length} of ${report.results} results lack fields that Ekphrasis needs to display an issue; the first: ${lines[0] ?? ""}.`,
      "Report to the maintainers of the tool that each SARIF result needs a message text and the artifact location of its file.",
      [...lines, ...details],
    );
  }
  return passed(
    subject,
    `The command wrote a valid SARIF 2.1.0 log in ${seconds(run.durationMs)} (${status}): ${report.results} ${report.results === 1 ? "result" : "results"}, ${report.issues.length} on the opened record.`,
    details,
  );
}

function durationCheck(
  name: string,
  durationMs: number,
  timeoutMs: number,
  startsCommand: boolean,
): DiagnosticCheck {
  const subject: CheckSubject = {
    id: `checker.duration:${name}`,
    consequence: "checks",
    dependency: `Duration of the checker \`${name}\``,
    affects: "custom checks of the records it selects",
  };
  const verdict = timeoutVerdict(durationMs, timeoutMs);
  const run = startsCommand
    ? "Each validation of a selected record starts the command again."
    : "Each validation calls the function in the running checker process.";
  const observed = `One run took ${seconds(durationMs)}; the timeout is ${seconds(timeoutMs)}. ${run}`;
  const queued =
    "The process of the checkers answers one call at a time, and the timeout of a call runs from its request, so a validation started during another call waits for it.";
  switch (verdict.status) {
    case "pass":
      return passed(
        subject,
        `${observed} The timeout also covers a call queued behind another, ${seconds(durationMs * QUEUED_CALL_FACTOR)}.`,
        [queued],
      );
    case "warning":
      return notPassed(
        "warning",
        subject,
        `${observed} A validation started while another call runs waits for it, about ${seconds(durationMs * QUEUED_CALL_FACTOR)} in all, and then exceeds the timeout.`,
        `Raise *Checker timeout* to ${seconds(verdict.recommendedMs)} in the settings of Ekphrasis.`,
        [queued],
      );
    case "fail":
      return notPassed(
        "fail",
        subject,
        `${observed} Every validation of a selected record exceeds the timeout, so its custom findings never display.`,
        `Raise *Checker timeout* to ${seconds(verdict.recommendedMs)} in the settings of Ekphrasis.`,
        [queued],
      );
  }
}
