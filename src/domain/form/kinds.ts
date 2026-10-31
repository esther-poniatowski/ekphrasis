/**
 * Field kinds, and their derivation from a schema: the keyword `x-kind` when it names a kind,
 * and else the standard keywords, following the tables of the feature note on field kinds.
 */
import type { JsonScalar } from "../schema/json";
import { isJsonScalar, jsonEquals } from "../schema/json";
import type { SchemaView } from "../schema/schema-view";

export const SCALAR_KINDS = [
  "label",
  "text",
  "markdown-line",
  "markdown",
  "latex",
  "number",
  "boolean",
  "choice",
] as const;

/**
 * Scalar kinds whose value holds one line, so that a commit never writes it as a block scalar.
 */
export const SINGLE_LINE_KINDS = ["label", "text", "markdown-line", "latex"] as const;

/** Collection kinds whose value is a mapping. */
export const MAPPING_KINDS = ["group", "keyed-table", "keyed-records", "alternatives"] as const;

/** Collection kinds whose value is a sequence. */
export const SEQUENCE_KINDS = ["choices", "list", "table", "records"] as const;

export type ScalarKind = (typeof SCALAR_KINDS)[number];
export type MappingKind = (typeof MAPPING_KINDS)[number];
export type SequenceKind = (typeof SEQUENCE_KINDS)[number];
export type CollectionKind = MappingKind | SequenceKind;
export type FieldKind = ScalarKind | CollectionKind;

const includes = <T extends string>(list: readonly T[], name: string): name is T =>
  (list as readonly string[]).includes(name);

export const isScalarKind = (name: string): name is ScalarKind => includes(SCALAR_KINDS, name);
export const isSingleLineKind = (name: string): boolean => includes(SINGLE_LINE_KINDS, name);
export const isMappingKind = (name: string): name is MappingKind => includes(MAPPING_KINDS, name);
export const isSequenceKind = (name: string): name is SequenceKind =>
  includes(SEQUENCE_KINDS, name);
export const isFieldKind = (name: string): name is FieldKind =>
  isScalarKind(name) || isMappingKind(name) || isSequenceKind(name);

/** One admitted value of a field of kind `choice`, with its annotations when the schema has some. */
export interface ChoiceOption {
  readonly value: JsonScalar;
  readonly title: string | null;
  readonly description: string | null;
}

/**
 * Admitted values of `schema`: those enumerated by every subschema that it composes and that
 * enumerates its values, in the order of the nearest one, each with the first title and the first
 * description declared for it. Returns `null` when no subschema enumerates its values. When the
 * subschemas admit no common value, the values of the nearest one, which the form then follows.
 */
export function choiceOptions(schema: SchemaView): ChoiceOption[] | null {
  const lists = enumerations(schema);
  const [nearest] = lists;
  if (nearest === undefined) return null;
  const common = commonOptions(lists);
  return common.length > 0 ? common : nearest;
}

/**
 * Options admitted by every list of `lists`, in the order of the first list, each with the first
 * title and the first description that a list declares for its value. Empty when the lists admit
 * no common value, or when there is no list.
 */
export function commonOptions(lists: readonly (readonly ChoiceOption[])[]): ChoiceOption[] {
  const [nearest = [], ...others] = lists;
  const all = lists.flat();
  return nearest
    .filter((option) =>
      others.every((options) => options.some((other) => jsonEquals(other.value, option.value))),
    )
    .map((option) => {
      const declared = all.filter((other) => jsonEquals(other.value, option.value));
      return {
        value: option.value,
        title: declared.find((other) => other.title !== null)?.title ?? null,
        description: declared.find((other) => other.description !== null)?.description ?? null,
      };
    });
}

/**
 * Admitted values enumerated by each layer of `schema` that enumerates them, nearest first: by
 * the keyword `enum`, a `oneOf` of `const` values, or a single `const`.
 */
export function enumerations(schema: SchemaView): ChoiceOption[][] {
  return schema.parts().flatMap((part) => {
    const options = layerOptions(part);
    return options === null ? [] : [options];
  });
}

/** Admitted values enumerated by the single layer `part`, or `null` when it enumerates none. */
function layerOptions(part: SchemaView): ChoiceOption[] | null {
  const values = part.enumValues;
  if (values !== null) {
    const scalars = values.filter(isJsonScalar);
    return scalars.length === 0
      ? null
      : scalars.map((value) => ({ value, title: null, description: null }));
  }
  const alternatives = part.oneOf();
  if (alternatives.length > 0) {
    const options = alternatives.map((alternative) => {
      const constant = alternative.constValue;
      return constant === null
        ? null
        : { value: constant.value, title: alternative.title, description: alternative.description };
    });
    return options.every((option) => option !== null) ? options : null;
  }
  const constant = part.constValue;
  return constant === null ? null : [{ value: constant.value, title: null, description: null }];
}

/** Kind of a field, with the name of a declared kind that names no kind, if any. */
export interface KindResolution {
  /** Kind of the field, or `null` when neither `x-kind` nor the standard keywords fix one. */
  readonly kind: FieldKind | null;
  /** Value of `x-kind` when it names no kind; the kind is then derived. */
  readonly unknownDeclaredKind: string | null;
}

/** Resolves the kind of the field described by `schema`. */
export function resolveKind(schema: SchemaView): KindResolution {
  const declared = schema.declaredKind;
  if (declared !== null && isFieldKind(declared)) {
    return { kind: declaredKind(schema, declared), unknownDeclaredKind: null };
  }
  return { kind: deriveKind(schema, 0), unknownDeclaredKind: declared };
}

/**
 * Kind of a field whose nearest keyword `x-kind` names the kind `declared`. A scalar kind
 * declared by a subschema farther than the nearest subschema enumerating the admitted values
 * yields to the kind `choice`, since a narrowing `enum` written over a base that declares a text
 * control restricts the answers to a list.
 */
function declaredKind(schema: SchemaView, declared: FieldKind): FieldKind {
  if (!isScalarKind(declared) || declared === "choice") return declared;
  const parts = schema.parts();
  const declaring = parts.findIndex((part) => part.declaredKind !== null);
  const enumerating = parts.findIndex((part) => layerOptions(part) !== null);
  return enumerating >= 0 && enumerating < declaring ? "choice" : declared;
}

/** Bound on the nesting examined to derive a kind, so a recursive schema terminates. */
const MAX_DEPTH = 16;

function kindAt(schema: SchemaView, depth: number): FieldKind | null {
  const declared = schema.declaredKind;
  return declared !== null && isFieldKind(declared)
    ? declaredKind(schema, declared)
    : deriveKind(schema, depth + 1);
}

/** Derives the kind of `schema` from its standard keywords only. */
function deriveKind(schema: SchemaView, depth: number): FieldKind | null {
  if (depth > MAX_DEPTH) return null;
  if (choiceOptions(schema) !== null) return "choice";
  const types = schema.types.filter((type) => type !== "null");
  const untyped = types.length === 0;
  if (types.includes("array") || (untyped && schema.items() !== null)) {
    return sequenceKind(schema, depth);
  }
  if (
    types.includes("object") ||
    (untyped && (schema.properties().length > 0 || schema.dynamicSchema() !== null))
  ) {
    return mappingKind(schema, depth);
  }
  if (untyped && isAlternatives(schema)) return "alternatives";
  if (types.includes("string")) return "text";
  if (types.includes("number") || types.includes("integer")) return "number";
  if (types.includes("boolean")) return "boolean";
  return null;
}

function sequenceKind(schema: SchemaView, depth: number): SequenceKind {
  const items = schema.items();
  if (items === null) return "list";
  if (schema.uniqueItems && choiceOptions(items) !== null) return "choices";
  const rows = rowKind(items, depth);
  if (rows !== null) return rows;
  const itemKind = kindAt(items, depth);
  return itemKind === null || isScalarKind(itemKind) ? "list" : "records";
}

function mappingKind(schema: SchemaView, depth: number): MappingKind {
  if (schema.properties().length > 0) return "group";
  if (isAlternatives(schema)) return "alternatives";
  const entries = schema.dynamicSchema();
  const rows = entries === null ? null : rowKind(entries, depth);
  if (rows === "table") return "keyed-table";
  if (rows === "records") return "keyed-records";
  return "group";
}

/** Whether `schema` holds a `oneOf` of object schemas, each declaring properties. */
export function isAlternatives(schema: SchemaView): boolean {
  const alternatives = schema.oneOf();
  return (
    alternatives.length > 0 &&
    alternatives.every((alternative) => alternative.properties().length > 0)
  );
}

/**
 * Kind of a collection whose entries follow `entry`: `table` when `entry` declares scalar
 * properties only, `records` when it declares a nested property, `null` when it declares none.
 * A property whose kind cannot be fixed counts as scalar.
 */
function rowKind(entry: SchemaView, depth: number): "table" | "records" | null {
  const properties = entry.properties();
  if (properties.length === 0) return null;
  const scalarOnly = properties.every(({ schema }) => {
    const kind = kindAt(schema, depth);
    return kind === null || isScalarKind(kind);
  });
  return scalarOnly ? "table" : "records";
}
