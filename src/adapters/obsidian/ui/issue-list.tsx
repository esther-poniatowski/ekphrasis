/**
 * Display of the issues of validation: the list of the issues at one place of the form, the count
 * of the issues within a group, and the phrase counting the issues of an instance.
 */
import type { JSX } from "preact";
import { markOf, type Issue, type IssueMark } from "../../../domain";
import { InlineText } from "./inline-text";

const MARK_NOUNS: Readonly<Record<IssueMark, readonly [string, string]>> = {
  missing: ["missing field", "missing fields"],
  invalid: ["invalid value", "invalid values"],
  warning: ["warning", "warnings"],
};

/** Phrase counting the issues of each mark, such as "2 missing fields and 1 invalid value". */
export function countPhrase(counts: Readonly<Record<IssueMark, number>>): string {
  const parts = (Object.keys(MARK_NOUNS) as IssueMark[])
    .filter((mark) => counts[mark] > 0)
    .map((mark) => `${counts[mark]} ${MARK_NOUNS[mark][counts[mark] === 1 ? 0 : 1]}`);
  if (parts.length === 0) return "no issue";
  const last = parts.pop();
  return parts.length === 0 ? `${last}` : `${parts.join(", ")} and ${last}`;
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
        <li key={index} class={`ekphrasis-issue mod-${markOf(item)}`} data-checker={item.checker}>
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

/** Mark shown on the content of a field: an invalid value first, then a missing field. */
export function fieldMark(issues: readonly Issue[]): IssueMark | null {
  const marks = new Set(issues.map(markOf));
  return (["invalid", "missing", "warning"] as const).find((mark) => marks.has(mark)) ?? null;
}
