/**
 * Display of the issues of validation: the list of the issues at one place of the form, the count
 * of the issues within a group, and the phrase counting the issues of an instance.
 */
import type { JSX } from "preact";
import {
  dominantMark,
  markOf,
  type Issue,
  type IssueMark,
  type IssueOrigin,
} from "../../../domain";
import { InlineText } from "./inline-text";

export const MARK_NOUNS: Readonly<Record<IssueMark, readonly [string, string]>> = {
  missing: ["missing field", "missing fields"],
  invalid: ["invalid value", "invalid values"],
  warning: ["warning", "warnings"],
  unresolved: ["unresolved state", "unresolved states"],
};

/**
 * Counts of the issues of each mark, as a list without conjunction, such as
 * "2 missing fields, 1 invalid value".
 */
export function countPhrase(counts: Readonly<Record<IssueMark, number>>): string {
  const parts = (Object.keys(MARK_NOUNS) as IssueMark[])
    .filter((mark) => counts[mark] > 0)
    .map((mark) => `${counts[mark]} ${MARK_NOUNS[mark][counts[mark] === 1 ? 0 : 1]}`);
  return parts.length === 0 ? "no issue" : parts.join(", ");
}

/**
 * Issues of one field or key, below its control. With `withPaths`, each issue is preceded by its
 * field path, for the issues displayed away from their field, and the messages start in one
 * column, after the longest path. An issue reported by an external tool is followed by the
 * classification and the guidance of that tool, and, away from its field, by its location as the
 * tool wrote it.
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
    <ul class={withPaths ? "ekphrasis-issues ekphrasis-path-messages" : "ekphrasis-issues"}>
      {issues.map((item, index) => (
        <li key={index} class={`ekphrasis-issue mod-${markOf(item)}`} data-checker={item.checker}>
          {withPaths && (
            <code class="ekphrasis-issue-path">{item.id === "" ? "(root)" : item.id}</code>
          )}
          <span class="ekphrasis-issue-message">
            <InlineText text={item.message} />
            {item.origin !== undefined && (
              <IssueOriginLines origin={item.origin} withLocus={withPaths} />
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Classification, guidance and, when `withLocus` holds, location of an external issue. */
function IssueOriginLines({
  origin,
  withLocus,
}: {
  readonly origin: IssueOrigin;
  readonly withLocus: boolean;
}): JSX.Element {
  const { rule, resultClass, repairCondition, documentationTarget, locus, discriminator } = origin;
  return (
    <span class="ekphrasis-issue-origin">
      {(rule !== undefined || resultClass !== undefined) && (
        <span class="ekphrasis-issue-origin-line ekphrasis-issue-rule">
          {rule !== undefined && <code>{rule}</code>}
          {rule !== undefined && resultClass !== undefined && " · "}
          {resultClass}
        </span>
      )}
      {repairCondition !== undefined && (
        <span class="ekphrasis-issue-origin-line ekphrasis-issue-repair">
          {"Repair: "}
          <InlineText text={repairCondition} />
        </span>
      )}
      {documentationTarget !== undefined && (
        <span class="ekphrasis-issue-origin-line ekphrasis-issue-documentation">
          {"Documentation: "}
          <code>{documentationTarget}</code>
        </span>
      )}
      {withLocus && locus !== undefined && (
        <span class="ekphrasis-issue-origin-line ekphrasis-issue-locus">
          {"Location: "}
          <code>{locus === "" ? "(whole record)" : locus}</code>
          {discriminator !== undefined && (
            <>
              {" · "}
              <code>{discriminator}</code>
            </>
          )}
        </span>
      )}
    </span>
  );
}

/** Number of issues within a group or a collection, beside its label. */
export function IssueCount({
  count,
  mark,
}: {
  readonly count: number;
  readonly mark: IssueMark | null;
}): JSX.Element | null {
  if (count === 0) return null;
  return (
    <span class={`ekphrasis-issue-count${mark === null ? "" : ` mod-${mark}`}`}>
      {`${count} ${count === 1 ? "issue" : "issues"}`}
    </span>
  );
}

/** Mark shown on the content of a field: an invalid value first, then a missing field. */
export const fieldMark = dominantMark;
