/**
 * Section of a mapping field, headed by its label and the count of the issues within it, holding
 * one field per key. A click on its heading folds it. It displays the kinds `group` and
 * `alternatives`, and every mapping kind without a control of its own.
 *
 * A field of kind `alternatives` opens with a selector of the alternative. The selector shows the
 * alternative that the value matches, and choosing another one displays the fields of that
 * alternative, each written by its first edit, like any absent field. The switch first removes
 * the keys of the previous alternative only, after a confirmation when one of them holds a filled
 * value; a cancelled confirmation or a refused removal keeps the previous alternative.
 */
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { planAlternativeSwitch, type Field, type MappingField } from "../../../../domain";
import type { ControlProps } from "../control-registry";
import { DisabledNote, forbidsItself, useDisabling } from "../disabled-note";
import { LockNote, useLockDisclosure } from "../field-label";
import { useFormContext } from "../form-context";
import { IssueList } from "../issue-list";
import { FieldList } from "./field-list";
import { SectionHeading, useFold } from "./section-heading";

export function GroupSection({
  field,
  readOnly,
  actions,
}: ControlProps<MappingField>): JSX.Element {
  const disclosure = useLockDisclosure();
  const { issues, errors, editAll, confirmLoss } = useFormContext();
  const disabling = useDisabling(field);
  const fold = useFold(field);
  const error = errors.get(field.id) ?? null;
  const [chosen, choose] = useState<number | null>(null);
  const alternative = chosen ?? field.selectedAlternative;
  const switchTo = async (to: number | null): Promise<void> => {
    const { removals, lost } = planAlternativeSwitch(field, alternative, to);
    if (lost.length > 0) {
      const confirmed = await confirmLoss({
        alternative: to === null ? "no alternative" : alternativeTitle(field, to),
        fields: lost.map((child) => child.label),
      });
      if (!confirmed) return;
    }
    if (removals.length > 0 && !editAll(removals)) return;
    choose(to);
  };
  const children: readonly Field[] =
    field.kind === "alternatives" && alternative !== null
      ? (field.alternativeChildren[alternative] ?? field.children)
      : field.children;
  return (
    <section
      class="ekphrasis-group"
      data-path={field.id}
      data-kind={field.kind}
      data-folded={fold.folded ? true : undefined}
      data-disabled={forbidsItself(field, disabling) ? true : undefined}
    >
      <SectionHeading field={field} fold={fold} disclosure={disclosure} actions={actions} />
      <LockNote field={field} disclosure={disclosure} />
      <DisabledNote field={field} constraint={disabling} />
      {error !== null && (
        <div class="ekphrasis-commit-error" role="alert">
          {error}
        </div>
      )}
      <IssueList issues={issues.at(field.id)} />
      {!fold.folded && (
        <div class="ekphrasis-group-body">
          {field.kind === "alternatives" && (
            <AlternativeSelector
              field={field}
              selected={alternative}
              readOnly={readOnly}
              onChoose={(to) => void switchTo(to)}
            />
          )}
          <FieldList field={{ ...field, children }} />
          {children.length === 0 && field.extraEntries.length === 0 && (
            <div class="ekphrasis-empty">No entries.</div>
          )}
        </div>
      )}
    </section>
  );
}

function AlternativeSelector({
  field,
  selected,
  readOnly,
  onChoose,
}: {
  readonly field: MappingField;
  readonly selected: number | null;
  readonly readOnly: boolean;
  readonly onChoose: (index: number | null) => void;
}): JSX.Element {
  return (
    <div class="ekphrasis-alternative">
      <label>
        {"Alternative "}
        <select
          class="dropdown"
          value={selected === null ? "" : String(selected)}
          disabled={readOnly}
          onChange={(event) => {
            // The selector shows the displayed alternative until the switch is made.
            const select = event.currentTarget;
            const value = select.value;
            select.value = selected === null ? "" : String(selected);
            onChoose(value === "" ? null : Number(value));
          }}
        >
          <option value="">—</option>
          {field.alternatives.map((_, index) => (
            <option key={index} value={String(index)}>
              {alternativeTitle(field, index)}
            </option>
          ))}
        </select>
      </label>
      {field.selectedAlternative === null && field.node !== null && (
        <span> The value matches no alternative.</span>
      )}
    </div>
  );
}

/** Title of the alternative at position `index`, or its position when it has no title. */
function alternativeTitle(field: MappingField, index: number): string {
  return field.alternatives[index] ?? `Alternative ${index + 1}`;
}
