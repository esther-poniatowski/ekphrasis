/**
 * Section of a mapping field, headed by its label and the count of the issues within it, holding
 * one field per key. A click on its heading folds it. It displays the kinds `group` and
 * `alternatives`, and every mapping kind without a control of its own.
 *
 * A field of kind `alternatives` opens with a selector of the alternative. The selector shows the
 * alternative that the value matches, and choosing another one displays the fields of that
 * alternative, each written by its first edit, like any absent field.
 */
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import type { Field, MappingField } from "../../../../domain";
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
  const { issues, errors } = useFormContext();
  const disabling = useDisabling(field);
  const fold = useFold(field);
  const error = errors.get(field.id) ?? null;
  const [chosen, choose] = useState<number | null>(null);
  const alternative = chosen ?? field.selectedAlternative;
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
              onChoose={choose}
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
            const value = event.currentTarget.value;
            onChoose(value === "" ? null : Number(value));
          }}
        >
          <option value="">—</option>
          {field.alternatives.map((title, index) => (
            <option key={index} value={String(index)}>
              {title ?? `Alternative ${index + 1}`}
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
