/**
 * Summary of a request of the Python probe that received no answer, for the observed value of a
 * check, with the error output kept as technical details.
 */
import { seconds } from "./checker-command";
import type { ProbeOutcome } from "./ports";

/** Summary and details of a probe outcome other than an answer. */
export function probeFailure(outcome: Exclude<ProbeOutcome<unknown>, { status: "answered" }>): {
  readonly summary: string;
  readonly details: readonly string[];
} {
  switch (outcome.status) {
    case "launch-failed":
      return {
        summary: `the system refused to start it (${outcome.code}).`,
        details: [outcome.message],
      };
    case "failed":
      return {
        summary: `Python raised ${outcome.error}.`,
        details: tail([outcome.error, outcome.stderr]),
      };
    case "invalid-response":
      return {
        summary: `it exited with status ${String(outcome.exitCode)} without answering.`,
        details: tail([outcome.output, outcome.stderr]),
      };
    case "timed-out":
      return { summary: `it did not answer within ${seconds(outcome.afterMs)}.`, details: [] };
  }
}

function tail(texts: readonly string[]): string[] {
  return texts.map((text) => text.trim()).filter((text) => text !== "");
}
