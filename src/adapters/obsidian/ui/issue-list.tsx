/**
 * Display of the issues of validation: the list of the issues at one place of the form, the count
 * of the issues within a group, and the phrase counting the issues of an instance.
 */
import type { JSX } from "preact";
import type { Issue } from "../../../domain";
import { InlineText } from "./inline-text";

/** Phrase counting errors and warnings, such as "2 errors and 1 warning". */
export function countPhrase(errors: number, warnings: number): string {
  const parts = [
    errors > 0 ? `${errors} ${errors === 1 ? "error" : "errors"}` : null,
    warnings > 0 ? `${warnings} ${warnings === 1 ? "warning" : "warnings"}` : null,
  ].filter((part): part is string => part !== null);
  return parts.length === 0 ? "no issue" : parts.join(" and ");
}

/**
 * Issues of one field or key, below its control. With `withPaths`, each issue is preceded by its
 * field path, for the issues displayed away from their field.
 */
export function IssueList({
  issues,
  withPaths = false,
}: {
  readonly issues: readonly Issue[];
  readonly withPaths?: boolean;
}): JSX.Element | null {
  if (issues.length === 0) return null;
  return (
    <ul class="ekphrasis-issues">
      {issues.map((item, index) => (
        <li key={index} class={`ekphrasis-issue mod-${item.severity}`} data-checker={item.checker}>
          {withPaths && (
            <code class="ekphrasis-issue-path">{item.id === "" ? "(root)" : item.id}</code>
          )}
          <InlineText text={item.message} />
        </li>
      ))}
    </ul>
  );
}

/** Number of issues within a group or a collection, beside its label. */
export function IssueCount({ count }: { readonly count: number }): JSX.Element | null {
  if (count === 0) return null;
  return (
    <span class="ekphrasis-issue-count">{`${count} ${count === 1 ? "issue" : "issues"}`}</span>
  );
}

/** Severity shown by the frame of a field: the most severe of its issues. */
export function severityOf(issues: readonly Issue[]): Issue["severity"] | null {
  if (issues.some((item) => item.severity === "error")) return "error";
  return issues.length > 0 ? "warning" : null;
}
