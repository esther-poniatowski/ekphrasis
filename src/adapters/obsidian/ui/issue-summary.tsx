/**
 * Summary of the issues at the top of the form: one line per mark of issue, counting the issues
 * of that mark and naming each field that holds one, followed by the issues whose path
 * designates no field of the form. A click on the name of a field moves the form to that field.
 */
import type { JSX } from "preact";
import { fieldTrail, type FormModel, type IssueIndex, type IssueMark } from "../../../domain";
import { useFormContext } from "./form-context";
import { IssueList, MARK_NOUNS } from "./issue-list";

/** Order of the lines, the order of the counts in the notice of the command *Validate instance*. */
const LINE_ORDER: readonly IssueMark[] = ["missing", "invalid", "warning"];

export function IssueSummary({
  model,
  issues,
}: {
  readonly model: FormModel;
  readonly issues: IssueIndex;
}): JSX.Element | null {
  const { reveal } = useFormContext();
  if (issues.issues.length === 0) return null;
  const counts = issues.counts;
  const places = issues.placesByMark();
  return (
    <div class="ekphrasis-issue-summary">
      <div class="ekphrasis-issue-summary-title">Validation</div>
      <ul class="ekphrasis-issue-lines">
        {LINE_ORDER.filter((mark) => counts[mark] > 0).map((mark) => (
          <li key={mark} class={`ekphrasis-issue-line mod-${mark}`}>
            <span class="ekphrasis-issue-line-count">
              {`${counts[mark]} ${MARK_NOUNS[mark][counts[mark] === 1 ? 0 : 1]}`}
            </span>
            {places[mark].map(({ id, path }) => (
              <button
                key={id}
                type="button"
                class="ekphrasis-field-link"
                onClick={() => reveal(path)}
              >
                {(fieldTrail(model, path) ?? [id]).join(" › ")}
              </button>
            ))}
          </li>
        ))}
      </ul>
      <IssueList issues={issues.unplaced} withPaths />
    </div>
  );
}
