/**
 * Tables, for the kinds `table` and `keyed-table`: one row per item or entry, and one column per
 * property of the rows, each cell holding the control of the scalar kind of its property. A
 * table of kind `keyed-table` opens each row with the identifier of its entry.
 *
 * A row is added as a draft, written by the first value committed in one of its cells: the next
 * item of a sequence, or a new entry under the identifier typed by the author.
 */
import type { ComponentChildren, JSX } from "preact";
import {
  isScalarKind,
  placeField,
  type Field,
  type MappingField,
  type ScalarField,
  type SequenceField,
} from "../../../../domain";
import type { ControlProps } from "../control-registry";
import { FieldHelp, guidanceOf, HelpButton, hasGuidance, type Guidance } from "../field-help";
import { DisabledNote, forbidsItself, useDisabling } from "../disabled-note";
import { LockNote, useLockDisclosure } from "../field-label";
import { FieldView } from "../field-view";
import { useFormContext } from "../form-context";
import { columnHelpKey } from "../help-state";
import { fieldMark, IssueList } from "../issue-list";
import { useDraft } from "./draft";
import { ActionButton, EntryActions, ItemActions } from "./item-actions";
import { KeyAdder } from "./key-adder";
import { SectionHeading, useFold } from "./section-heading";
import { AddButton } from "./sequence-section";

/**
 * Column of a table: the key of a property of the rows, with its label, its requirement, and its
 * instructions and examples, displayed below the header of the table on demand.
 */
interface Column extends Guidance {
  readonly key: string;
  readonly label: string;
  readonly required: boolean;
}

/** Columns of rows shaped like `template`, a row of the table or its absent template. */
function columnsOf(template: Field | null | undefined): Column[] {
  if (template == null || !("children" in template)) return [];
  return template.children.map((child) => ({
    ...guidanceOf(child),
    key: String(child.path.at(-1)),
    label: child.label,
    required: child.required,
  }));
}

export function TableSection({
  field,
  readOnly,
  actions,
}: ControlProps<SequenceField>): JSX.Element {
  const draft = useDraft();
  const next = field.next;
  const drafted = next !== null && draft.key === next.key ? next : null;
  const count = field.items.length;
  const rows = field.items.map((item) => (
    <TableRow
      key={item.key}
      row={item}
      readOnly={readOnly}
      actions={<ItemActions item={item} count={count} readOnly={readOnly} />}
    />
  ));
  if (drafted !== null) {
    rows.push(
      <TableRow
        key={drafted.key}
        row={drafted}
        readOnly={readOnly}
        actions={<ActionButton label="Discard the new row" symbol="✕" onClick={draft.close} />}
      />,
    );
  }
  return (
    <TableFrame
      field={field}
      columns={columnsOf(next ?? field.items[0])}
      keyed={false}
      rows={rows}
      actions={actions}
      adder={
        <AddButton
          label="Add a row"
          disabled={readOnly || next === null || drafted !== null}
          onClick={() => (next === null ? undefined : draft.open(next.key))}
        />
      }
    />
  );
}

export function KeyedTableSection({
  field,
  readOnly,
  actions,
}: ControlProps<MappingField>): JSX.Element {
  const draft = useDraft();
  const template = field.entryTemplate;
  const keys = field.children.map((child) => child.key);
  const drafted =
    template !== null && draft.key !== null && !keys.includes(draft.key)
      ? placeField(template, [...field.path, draft.key], [...field.identity, draft.key])
      : null;
  const rows = field.children.map((child) => (
    <TableRow
      key={child.key}
      row={child}
      identifier={child.key}
      readOnly={readOnly}
      actions={<EntryActions entry={child} readOnly={readOnly} />}
    />
  ));
  if (drafted !== null) {
    rows.push(
      <TableRow
        key={drafted.key}
        row={drafted}
        identifier={drafted.key}
        readOnly={readOnly}
        actions={<ActionButton label="Discard the new row" symbol="✕" onClick={draft.close} />}
      />,
    );
  }
  return (
    <TableFrame
      field={field}
      columns={columnsOf(template ?? field.children[0])}
      keyed={true}
      rows={rows}
      actions={actions}
      adder={
        <KeyAdder
          keys={keys}
          disabled={readOnly || template === null || drafted !== null}
          onAdd={draft.open}
        />
      }
    />
  );
}

/** Section holding a table: its heading, the header row, the rows, and the way to add a row. */
function TableFrame({
  field,
  columns,
  keyed,
  rows,
  actions,
  adder,
}: {
  readonly field: Field;
  readonly columns: readonly Column[];
  readonly keyed: boolean;
  readonly rows: readonly JSX.Element[];
  readonly actions: ComponentChildren;
  readonly adder: JSX.Element;
}): JSX.Element {
  const disclosure = useLockDisclosure();
  const { issues, errors } = useFormContext();
  const disabling = useDisabling(field);
  const fold = useFold(field);
  const error = errors.get(field.id) ?? null;
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
          {columns.map((column) => (
            <FieldHelp
              key={column.key}
              helpKey={columnHelpKey(field.uid, column.key)}
              guidance={column}
              title={column.label}
            />
          ))}
          <div class="ekphrasis-table-scroll">
            <table class="ekphrasis-table">
              <thead>
                <tr>
                  {keyed && <th>Identifier</th>}
                  {columns.map((column) => (
                    <th key={column.key}>
                      {column.label}
                      {column.required && (
                        <span class="ekphrasis-required" aria-label="required">
                          *
                        </span>
                      )}
                      {hasGuidance(column) && (
                        <HelpButton
                          helpKey={columnHelpKey(field.uid, column.key)}
                          label={column.label}
                        />
                      )}
                    </th>
                  ))}
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </table>
          </div>
          {adder}
        </div>
      )}
    </section>
  );
}

/** Row of a table: one cell per column, the actions of the row, and its keys outside the schema. */
function TableRow({
  row,
  identifier,
  readOnly,
  actions,
}: {
  readonly row: Field;
  readonly identifier?: string;
  readonly readOnly: boolean;
  readonly actions: JSX.Element;
}): JSX.Element {
  const { issues, errors } = useFormContext();
  const rowIssues = issues.at(row.id);
  const error = errors.get(row.id) ?? null;
  if (!("children" in row) || row.mismatch !== null) {
    return (
      <tr data-path={row.id}>
        {identifier !== undefined && <td class="ekphrasis-table-key">{identifier}</td>}
        <td colSpan={99}>
          <pre class="ekphrasis-yaml-text">{row.mismatch ?? ""}</pre>
          <IssueList issues={rowIssues} />
        </td>
        <td>{actions}</td>
      </tr>
    );
  }
  return (
    <tr data-path={row.id} data-issue={fieldMark(rowIssues) ?? undefined}>
      {identifier !== undefined && <td class="ekphrasis-table-key">{identifier}</td>}
      {row.children.map((cell) => (
        <td key={cell.key} data-path={cell.id} data-kind={cell.kind}>
          <Cell field={cell} readOnly={readOnly || row.lock !== null} />
        </td>
      ))}
      <td class="ekphrasis-table-actions">
        {actions}
        {error !== null && (
          <div class="ekphrasis-commit-error" role="alert">
            {error}
          </div>
        )}
        <IssueList issues={rowIssues} />
        {row.extraEntries.map((entry) => (
          <pre key={entry.id} class="ekphrasis-yaml-text" title="Key outside the schema">
            {`${entry.key}: ${entry.text}`}
          </pre>
        ))}
      </td>
    </tr>
  );
}

/** Cell of a table: the control of a scalar property, with its issues; any other kind in full. */
function Cell({
  field,
  readOnly,
}: {
  readonly field: Field;
  readonly readOnly: boolean;
}): JSX.Element {
  const { registry, commit, errors, issues } = useFormContext();
  const disabling = useDisabling(field);
  if (!isScalarKind(field.kind) || field.mismatch !== null) return <FieldView field={field} />;
  const scalar = field as ScalarField;
  const Control = registry.scalar(scalar.kind);
  const cellIssues = issues.at(field.id);
  const error = errors.get(field.id) ?? null;
  return (
    <div class="ekphrasis-table-cell" data-issue={fieldMark(cellIssues) ?? undefined}>
      <Control
        field={scalar}
        readOnly={readOnly || disabling !== null || field.lock !== null}
        onCommit={(value) => commit(field.path, value)}
      />
      {error !== null && (
        <div class="ekphrasis-commit-error" role="alert">
          {error}
        </div>
      )}
      <IssueList issues={cellIssues} />
      <DisabledNote field={field} constraint={disabling} />
    </div>
  );
}
