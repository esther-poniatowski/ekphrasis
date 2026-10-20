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
  /** Printed field path, unique in the model, which places the issues and the commits. */
  readonly id: string;
  readonly path: YamlPath;
  /**
   * Identifier of the field among its siblings, kept across reorderings: the key of a mapping
   * entry, or the identifier of a sequence item. It keys the control of the field.
   */
  readonly key: string;
  /**
   * Keys and item identifiers from the root to the field, so a field keeps its identity when an
   * item containing it moves.
   */
  readonly identity: readonly string[];
  /** Printed identity, unique in the model, which keys the state of the field in the form. */
  readonly uid: string;
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
  /**
   * Whether the value counts as unfilled: absent, the null value, or a value of the keyword
   * `x-unfilled`. The control of an unfilled field displays no value, whatever the file holds.
   */
  readonly unfilled: boolean;
}

export interface ScalarField extends FieldBase {
  readonly kind: ScalarKind;
  /** Value written in the file, or `null` when the instance holds no such key. */
  readonly value: ScalarValue;
  /**
   * Admitted values of a field of kind `choice`, without the unfilled values, which the empty
   * option stands for; empty for the other kinds.
   */
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
  /**
   * Fields of each alternative, the properties of the parent included, so the form displays the
   * fields of an alternative that the value does not match yet; empty for the other kinds.
   */
  readonly alternativeChildren: readonly (readonly Field[])[];
  /**
   * Absent entry of a mapping whose keys are identifiers, placed under the key `""`, from which
   * the form displays a new entry once its key is chosen; `null` for a mapping without such keys.
   */
  readonly entryTemplate: Field | null;
  /** Whether the keyword `x-collapsed` folds the field when the form opens. */
  readonly collapsed: boolean;
}

export interface SequenceField extends FieldBase {
  readonly kind: SequenceKind;
  readonly items: readonly Field[];
  /**
   * Absent item after the last one, whose first edited value inserts it; `null` beyond the depth
   * of nested templates, so a recursive schema terminates.
   */
  readonly next: Field | null;
  /** Whether the keyword `x-collapsed` folds the field when the form opens. */
  readonly collapsed: boolean;
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
