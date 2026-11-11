/**
 * Summary of the issues at the top of the form: one line per mark of issue, counting the issues
 * of that mark and naming each field that holds one, followed by the issues whose path
 * designates no field of the form. A click on the name of a field moves the form to that field.
 */
import type { JSX } from "preact";
import {
  fieldChain,
  fieldTrail,
  markOf,
  type FormModel,
  type Issue,
  type IssueIndex,
  type IssueMark,
  type YamlPath,
} from "../../../domain";
import { useFormContext } from "./form-context";
import { InlineText } from "./inline-text";
import { IssueList, MARK_NOUNS } from "./issue-list";

/** Actionable order of validation failures; unresolved research state has a separate box. */
const VALIDATION_LINE_ORDER: readonly IssueMark[] = ["missing", "invalid", "warning"];

/** Issues produced by one decision follow the same actionable order as the summary lines. */
function orderedIssues(issues: readonly Issue[]): Issue[] {
  return [...issues].sort(
    (left, right) =>
      VALIDATION_LINE_ORDER.indexOf(markOf(left)) - VALIDATION_LINE_ORDER.indexOf(markOf(right)),
  );
}

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
  const validation = issues.issues.filter((item) => markOf(item) !== "unresolved");
  const unresolved = issues.issues.filter((item) => markOf(item) === "unresolved");
  return (
    <>
      {validation.length > 0 && (
        <div class="ekphrasis-issue-summary">
          <div class="ekphrasis-issue-summary-title">Validation</div>
          <ControlGroups model={model} issues={validation} reveal={reveal} />
          <ul class="ekphrasis-issue-lines">
            {VALIDATION_LINE_ORDER.filter((mark) => counts[mark] > 0).map((mark) => (
              <SummaryLine
                key={mark}
                mark={mark}
                count={counts[mark]}
                places={places[mark]}
                model={model}
                reveal={reveal}
              />
            ))}
          </ul>
          <IssueList
            issues={orderedIssues(issues.unplaced.filter((item) => markOf(item) !== "unresolved"))}
            withPaths
          />
        </div>
      )}
      {unresolved.length > 0 && (
        <div class="ekphrasis-research-summary">
          <div class="ekphrasis-issue-summary-title">Research state</div>
          <ul class="ekphrasis-issue-lines">
            <SummaryLine
              mark="unresolved"
              count={counts.unresolved}
              places={places.unresolved}
              model={model}
              reveal={reveal}
            />
          </ul>
          <IssueList
            issues={issues.unplaced.filter((item) => markOf(item) === "unresolved")}
            withPaths
          />
        </div>
      )}
    </>
  );
}

function SummaryLine({
  mark,
  count,
  places,
  model,
  reveal,
}: {
  readonly mark: IssueMark;
  readonly count: number;
  readonly places: readonly { readonly id: string; readonly path: YamlPath }[];
  readonly model: FormModel;
  readonly reveal: (path: YamlPath) => void;
}): JSX.Element {
  return (
    <li class={`ekphrasis-issue-line mod-${mark}`}>
      <span class="ekphrasis-issue-line-count">
        {`${count} ${MARK_NOUNS[mark][count === 1 ? 0 : 1]}`}
      </span>
      {places.map(({ id, path }) => (
        <button key={id} type="button" class="ekphrasis-field-link" onClick={() => reveal(path)}>
          {(fieldTrail(model, path) ?? [id]).join(" › ")}
        </button>
      ))}
    </li>
  );
}

interface ControlGroup {
  readonly id: string;
  readonly path: YamlPath;
  readonly issues: Issue[];
}

/** Findings grouped by the existing field whose value or presence activates them. */
function controlGroups(model: FormModel, issues: readonly Issue[]): ControlGroup[] {
  const groups = new Map<string, ControlGroup>();
  for (const item of issues) {
    if (item.controlledBy === undefined) continue;
    const controller = fieldChain(model.root, item.controlledBy)?.at(-1);
    if (controller === undefined) continue;
    const current = groups.get(controller.id) ?? {
      id: controller.id,
      path: item.controlledBy,
      issues: [],
    };
    current.issues.push(item);
    groups.set(controller.id, current);
  }
  return [...groups.values()];
}

/** One cross-mark group for every field that controls current findings. */
function ControlGroups({
  model,
  issues,
  reveal,
}: {
  readonly model: FormModel;
  readonly issues: readonly Issue[];
  readonly reveal: (path: YamlPath) => void;
}): JSX.Element | null {
  const groups = controlGroups(model, issues);
  if (groups.length === 0) return null;
  return (
    <ul class="ekphrasis-issue-control-groups">
      {groups.map((group) => (
        <li key={group.id} class="ekphrasis-issue-control-group" data-controller={group.id}>
          <div class="ekphrasis-issue-control-heading">
            <span>Controlled by </span>
            <button
              type="button"
              class="ekphrasis-field-link ekphrasis-issue-controller"
              onClick={() => reveal(group.path)}
            >
              {(fieldTrail(model, group.path) ?? [group.id]).join(" › ")}
            </button>
          </div>
          <ul class="ekphrasis-controlled-issues">
            {orderedIssues(group.issues).map((item, index) => {
              const target = fieldChain(model.root, item.path);
              return (
                <li
                  key={index}
                  class={`ekphrasis-controlled-issue ekphrasis-issue mod-${markOf(item)}`}
                  data-checker={item.checker}
                >
                  {target === null ? (
                    <code class="ekphrasis-issue-path">{item.id === "" ? "(root)" : item.id}</code>
                  ) : (
                    <button
                      type="button"
                      class="ekphrasis-field-link"
                      onClick={() => reveal(item.path)}
                    >
                      {(fieldTrail(model, item.path) ?? [item.id]).join(" › ")}
                    </button>
                  )}
                  <span class="ekphrasis-issue-message">
                    <InlineText text={item.message} />
                  </span>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}
