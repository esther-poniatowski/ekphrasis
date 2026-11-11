/**
 * Report of the setup diagnostic: a summary of the statuses, then one section per consequence,
 * from what blocks the forms to what only reduces the functionality. Within a section, the checks
 * that fail come first. Each check states its status in words, its dependency and its observed
 * value; a check that does not pass adds the capability affected and the next action. Technical
 * details, such as paths, commands and error output, stay folded in a block that the researcher
 * can expand and copy.
 */
import type { JSX } from "preact";
import {
  CHECK_STATUSES,
  groupChecks,
  statusCounts,
  type CheckStatus,
  type DiagnosticCheck,
  type DiagnosticReport,
} from "../../../application";
import { InlineText } from "./inline-text";

export const STATUS_LABELS: Readonly<Record<CheckStatus, string>> = {
  pass: "Pass",
  warning: "Warning",
  fail: "Fail",
  unavailable: "Unavailable",
};

/** State of the panel: the checks run, or their report is ready. */
export type DiagnosticPanelState =
  { readonly status: "running" } | { readonly status: "ready"; readonly report: DiagnosticReport };

export function DiagnosticPanel({
  state,
  onCopy,
  onRunAgain,
}: {
  readonly state: DiagnosticPanelState;
  readonly onCopy: () => void;
  readonly onRunAgain: () => void;
}): JSX.Element {
  if (state.status === "running") {
    return (
      <div class="ekphrasis-diagnostic">
        <p class="ekphrasis-diagnostic-running">
          Checking the schemas, the opened record and the custom checkers. A configured checker runs
          once on the opened record, which can take several seconds.
        </p>
      </div>
    );
  }
  const { report } = state;
  const counts = statusCounts(report.checks);
  return (
    <div class="ekphrasis-diagnostic">
      <p class="ekphrasis-diagnostic-summary">
        {CHECK_STATUSES.filter((status) => counts[status] > 0)
          .map((status) => `${counts[status]} ${STATUS_LABELS[status].toLowerCase()}`)
          .join(" · ")}
        {` — the diagnostic changed no file, setting or environment.`}
      </p>
      {groupChecks(report.checks).map((group) => (
        <section key={group.key} class={`ekphrasis-diagnostic-group mod-${group.key}`}>
          <h3 class="ekphrasis-diagnostic-group-title">{group.title}</h3>
          <ul class="ekphrasis-diagnostic-checks">
            {bySeverity(group.checks).map((check) => (
              <CheckItem key={check.id} check={check} />
            ))}
          </ul>
        </section>
      ))}
      <div class="modal-button-container">
        <button type="button" onClick={onRunAgain}>
          Run again
        </button>
        <button type="button" class="mod-cta" onClick={onCopy}>
          Copy report
        </button>
      </div>
    </div>
  );
}

/** Checks in the order of their statuses, failures first, each status keeping the order of the route. */
function bySeverity(checks: readonly DiagnosticCheck[]): readonly DiagnosticCheck[] {
  return CHECK_STATUSES.flatMap((status) => checks.filter((check) => check.status === status));
}

function CheckItem({ check }: { readonly check: DiagnosticCheck }): JSX.Element {
  return (
    <li class={`ekphrasis-diagnostic-check mod-${check.status}`} data-check={check.id}>
      <div class="ekphrasis-diagnostic-check-head">
        <span class="ekphrasis-diagnostic-status">{STATUS_LABELS[check.status]}</span>
        <span class="ekphrasis-diagnostic-dependency">
          <InlineText text={check.dependency} />
        </span>
      </div>
      <div class="ekphrasis-diagnostic-observed">
        <InlineText text={check.observed} emphasis />
      </div>
      {check.action === null ? null : (
        <>
          <div class="ekphrasis-diagnostic-line">
            <span class="ekphrasis-diagnostic-label">Affects: </span>
            <InlineText text={check.affects} />
          </div>
          <div class="ekphrasis-diagnostic-line ekphrasis-diagnostic-action">
            <span class="ekphrasis-diagnostic-label">Next action: </span>
            <InlineText text={check.action} emphasis />
          </div>
        </>
      )}
      {check.details.length === 0 ? null : (
        <details class="ekphrasis-diagnostic-details">
          <summary>Technical details</summary>
          <pre>{check.details.join("\n")}</pre>
        </details>
      )}
    </li>
  );
}
