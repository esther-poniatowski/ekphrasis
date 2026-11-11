/** Generic read-only tree built from scalar node properties carrying schema-declared tree roles. */
import type { JSX } from "preact";
import {
  isScalarKind,
  type MappingField,
  type ScalarField,
  type SequenceField,
  type TreeRole,
} from "../../../../domain";
import type { ControlProps } from "../control-registry";
import { displayedValue, formatScalar, UNFILLED_MARK } from "../controls/scalar-format";
import { DisabledNote, forbidsItself, useDisabling } from "../disabled-note";
import { LockNote, useLockDisclosure } from "../field-label";
import { useFormContext } from "../form-context";
import { fieldMark, IssueList } from "../issue-list";
import { SectionHeading, useFold } from "./section-heading";
import { SequenceSection } from "./sequence-section";

interface TreeNode {
  readonly field: MappingField;
  readonly children: TreeNode[];
}

export function TreeSection(props: ControlProps<SequenceField>): JSX.Element {
  const { field, readOnly, actions } = props;
  if (!readOnly) return <SequenceSection {...props} />;
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
          <ul class="ekphrasis-tree" role="tree" aria-label={field.label}>
            {treeOf(field).map((node) => (
              <TreeItem key={node.field.key} node={node} level={1} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function TreeItem({
  node,
  level,
}: {
  readonly node: TreeNode;
  readonly level: number;
}): JSX.Element {
  const { issues } = useFormContext();
  const label = roleField(node.field, "label");
  const identifier = roleField(node.field, "identifier");
  const details = roleFields(node.field, "detail");
  const labelText = textOf(label);
  const identifierText = textOf(identifier);
  const shownLabel = labelText || identifierText || UNFILLED_MARK;
  const nodeIssues = [
    ...issues.at(node.field.id),
    ...node.field.children.flatMap((child) => issues.at(child.id)),
  ];
  return (
    <li
      class="ekphrasis-tree-item"
      role="treeitem"
      aria-level={level}
      data-path={node.field.id}
      data-issue={fieldMark(nodeIssues) ?? undefined}
    >
      <div class="ekphrasis-tree-node">
        <span class="ekphrasis-tree-label" data-path={label?.id}>
          {shownLabel}
        </span>
        {identifierText !== "" && identifierText !== shownLabel && (
          <code class="ekphrasis-tree-identifier" data-path={identifier?.id}>
            {identifierText}
          </code>
        )}
        {details.flatMap((detail) => {
          const value = textOf(detail);
          return value === ""
            ? []
            : [
                <span class="ekphrasis-tree-detail" data-path={detail.id} key={detail.id}>
                  <span class="ekphrasis-tree-detail-label">{`${detail.label}: `}</span>
                  {value}
                </span>,
              ];
        })}
        {roleField(node.field, "depth") !== null && (
          <span
            class="ekphrasis-tree-depth-target"
            data-path={roleField(node.field, "depth")?.id}
          />
        )}
      </div>
      <IssueList issues={nodeIssues} />
      {node.children.length > 0 && (
        <ul class="ekphrasis-tree-children" role="group">
          {node.children.map((child) => (
            <TreeItem key={child.field.key} node={child} level={level + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Reconstruct the hierarchy from the producer-ordered rows and their declared depth role. */
function treeOf(field: SequenceField): TreeNode[] {
  const roots: TreeNode[] = [];
  const ancestors: TreeNode[] = [];
  for (const item of field.items) {
    if (!("children" in item)) continue;
    const node: TreeNode = { field: item, children: [] };
    const depth = Math.min(depthOf(item), ancestors.length);
    ancestors.length = depth;
    const parent = ancestors.at(-1);
    if (parent === undefined) roots.push(node);
    else parent.children.push(node);
    ancestors.push(node);
  }
  return roots;
}

function depthOf(field: MappingField): number {
  const value = roleField(field, "depth")?.value;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function roleField(field: MappingField, role: TreeRole): ScalarField | null {
  return roleFields(field, role)[0] ?? null;
}

function roleFields(field: MappingField, role: TreeRole): ScalarField[] {
  return field.children.filter(
    (child): child is ScalarField => child.treeRole === role && isScalarKind(child.kind),
  );
}

function textOf(field: ScalarField | null): string {
  return field === null ? "" : formatScalar(displayedValue(field));
}
