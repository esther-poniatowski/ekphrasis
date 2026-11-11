/**
 * Report of the setup diagnostic: one check per dependency of the route from the schema registry
 * to an issue displayed at its field, each with a status and, when it does not pass, the
 * capability lost and the next action of the researcher.
 *
 * The checks are grouped by their consequence, the capability that a failure removes, so that a
 * researcher reads first what blocks the forms, then the saving of records, then the custom
 * checks, and last what only reduces the functionality.
 */

/**
 * Outcome of one check: `pass`; `warning` when the dependency works with a reduced function;
 * `fail` when it is broken; `unavailable` when the check could not run, because the platform does
 * not offer it or because a dependency checked earlier failed.
 */
export type CheckStatus = "pass" | "warning" | "fail" | "unavailable";

/** Capability that a failure of the check removes. */
export type Consequence = "forms" | "saving" | "checks" | "degraded";

/** Consequences in the order of display, with the title of their group. */
export const CONSEQUENCES: readonly { readonly key: Consequence; readonly title: string }[] = [
  { key: "forms", title: "Blocks schema-derived forms" },
  { key: "saving", title: "Blocks saving authored records" },
  { key: "checks", title: "Blocks configured custom checks" },
  { key: "degraded", title: "Reduces functionality; editing stays available" },
];

export const CHECK_STATUSES: readonly CheckStatus[] = ["fail", "warning", "unavailable", "pass"];

/** Dependency examined by a check, independently of its outcome. */
export interface CheckSubject {
  /** Stable key of the check, such as `registry.read` or `checker.report:tool`. */
  readonly id: string;
  readonly consequence: Consequence;
  /** Dependency checked, named for the researcher, such as *Schema registry file*. */
  readonly dependency: string;
  /** Capability that depends on it, such as *forms of the records declaring `_schema`*. */
  readonly affects: string;
}

export interface DiagnosticCheck extends CheckSubject {
  readonly status: CheckStatus;
  /** Observed value or failure, in one or two sentences. */
  readonly observed: string;
  /** Next action of the researcher; present exactly when the check does not pass. */
  readonly action: string | null;
  /** Technical details that a researcher can copy or expand: paths, commands, error output. */
  readonly details: readonly string[];
}

export interface DiagnosticReport {
  readonly checks: readonly DiagnosticCheck[];
  /** Duration of the whole diagnostic, in milliseconds. */
  readonly durationMs: number;
}

/** Check that passed, with its observed value. */
export function passed(
  subject: CheckSubject,
  observed: string,
  details: readonly string[] = [],
): DiagnosticCheck {
  return { ...subject, status: "pass", observed, action: null, details };
}

/** Check that did not pass, with the next action of the researcher. */
export function notPassed(
  status: Exclude<CheckStatus, "pass">,
  subject: CheckSubject,
  observed: string,
  action: string,
  details: readonly string[] = [],
): DiagnosticCheck {
  return { ...subject, status, observed, action, details };
}

/**
 * Check that could not run because the dependency `blocker`, reported by another check, failed;
 * its action sends the researcher to that check.
 */
export function blocked(subject: CheckSubject, blocker: string): DiagnosticCheck {
  return notPassed(
    "unavailable",
    subject,
    `Not checked, since ${blocker} failed.`,
    `Repair ${blocker} first, then run the diagnostic again.`,
  );
}

/** Number of checks of each status. */
export function statusCounts(checks: readonly DiagnosticCheck[]): Record<CheckStatus, number> {
  const counts: Record<CheckStatus, number> = { pass: 0, warning: 0, fail: 0, unavailable: 0 };
  for (const check of checks) counts[check.status] += 1;
  return counts;
}

/** Checks of each consequence, in the order of display, each group keeping the order of its checks. */
export function groupChecks(checks: readonly DiagnosticCheck[]): readonly {
  readonly key: Consequence;
  readonly title: string;
  readonly checks: readonly DiagnosticCheck[];
}[] {
  return CONSEQUENCES.map(({ key, title }) => ({
    key,
    title,
    checks: checks.filter((check) => check.consequence === key),
  })).filter((group) => group.checks.length > 0);
}

/** Plain text of the report, which the researcher can copy into a message or an issue. */
export function reportText(report: DiagnosticReport): string {
  const counts = statusCounts(report.checks);
  const lines = [
    `Ekphrasis setup diagnostic: ${CHECK_STATUSES.map((status) => `${counts[status]} ${status}`).join(", ")}`,
  ];
  for (const group of groupChecks(report.checks)) {
    lines.push("", `## ${group.title}`);
    for (const check of group.checks) {
      lines.push(`[${check.status}] ${check.dependency}: ${check.observed}`);
      if (check.action !== null) {
        lines.push(`  Affects: ${check.affects}`, `  Next action: ${check.action}`);
      }
      for (const detail of check.details) lines.push(`  | ${detail}`);
    }
  }
  return lines.join("\n");
}
