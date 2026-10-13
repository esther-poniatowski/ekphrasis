/**
 * Form model: one field per property of the schema, holding its kind, its annotations, its field
 * path and, when the instance contains it, its node.
 *
 * The model is plain data computed by a pure function, so the controls, the issues and the
 * outline refer to one field through the same path, and unit tests build it without Obsidian.
 */
import type { ScalarValue, YamlNode, YamlPath } from "../model";
import type { JsonValue } from "../schema/json";
import type { ChoiceOption, MappingKind, ScalarKind, SequenceKind } from "./kinds";

/**
 * Reason why a field displays a value that a commit at the field must not change: the value is
 * reached through an alias, or merged from another mapping by the key `<<`. In both cases the
 * text of the value lies at its anchor, outside the range of the field.
 */
export type FieldLock = "alias" | "merge";

export interface FieldBase {
  /** Printed field path, unique in the model, so it keys the control of the field. */
  readonly id: string;
  readonly path: YamlPath;
  /**
   * Title of the schema, else the key (read with spaces for a declared property), else the
   * position of the item.
   */
  readonly label: string;
  readonly description: string | null;
  readonly examples: readonly JsonValue[];
  readonly required: boolean;
  /** Node of the field, aliases resolved, or `null` when the instance holds no such key. */
  readonly node: YamlNode | null;
  readonly lock: FieldLock | null;
  /**
   * Source text of a value whose shape the kind cannot hold, such as a mapping under a field of
   * kind `text`, or `null` when the shape fits. Such a value is displayed as text, read-only.
   */
  readonly mismatch: string | null;
  /** Entries of the keyword `x-rules` of the schema of the field, checked when validating. */
  readonly rules: readonly JsonValue[];
}

export interface ScalarField extends FieldBase {
  readonly kind: ScalarKind;
  readonly value: ScalarValue;
  /** Admitted values of a field of kind `choice`; empty for the other kinds. */
  readonly options: readonly ChoiceOption[];
}

export interface MappingField extends FieldBase {
  readonly kind: MappingKind;
  /** Declared properties in the order of the schema, then the keys admitted by a pattern. */
  readonly children: readonly Field[];
  /** Keys of the instance that no subschema describes, in the order of the file. */
  readonly extraEntries: readonly ExtraEntry[];
  /** Titles of the alternatives of a field of kind `alternatives`; empty for the other kinds. */
  readonly alternatives: readonly (string | null)[];
  /** Position of the alternative that the value matches, or `null` when none matches. */
  readonly selectedAlternative: number | null;
}

export interface SequenceField extends FieldBase {
  readonly kind: SequenceKind;
  readonly items: readonly Field[];
}

export type Field = ScalarField | MappingField | SequenceField;

/** Key of the instance outside the schema, displayed as YAML text. */
export interface ExtraEntry {
  readonly id: string;
  readonly key: string;
  /** Source text of the value. */
  readonly text: string;
}

/** Defect of the schema met while building the model, located at a field. */
export interface SchemaIssue {
  /** Printed field path of the field concerned; `""` for the root. */
  readonly path: string;
  readonly message: string;
}

export interface FormModel {
  /** Title of the root schema. */
  readonly title: string | null;
  readonly root: Field;
  /** Values that the schema counts as unfilled besides the null value, in their written order. */
  readonly unfilled: readonly JsonValue[];
  readonly schemaIssues: readonly SchemaIssue[];
}
