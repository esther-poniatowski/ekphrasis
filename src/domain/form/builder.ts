/**
 * Construction of the form model from a schema set and the parsed tree of an instance.
 */
import type { YamlNode, YamlPath } from "../model";
import { printFieldPath } from "../paths/field-path";
import type { PropertySchema } from "../schema/schema-view";
import { SchemaView } from "../schema/schema-view";
import type { JsonValue } from "../schema/json";
import type { SchemaSet } from "../schema/schema-set";
import { effectiveEntries, resolveAliases } from "./entries";
import {
  choiceOptions,
  isMappingKind,
  isScalarKind,
  resolveKind,
  type FieldKind,
  type MappingKind,
  type ScalarKind,
  type SequenceKind,
} from "./kinds";
import type {
  ExtraEntry,
  FieldBase,
  Field,
  FieldLock,
  FormModel,
  MappingField,
  ScalarField,
  SchemaIssue,
  SequenceField,
} from "./model";

/** Builds the form model of the instance `tree`, parsed from `source`, under `schemas`. */
export function buildFormModel(schemas: SchemaSet, tree: YamlNode, source: string): FormModel {
  return new FormModelBuilder(source).build(SchemaView.root(schemas), tree);
}

/** Position of one field: its path, its schema, its node and the context set by its parent. */
interface FieldSite {
  readonly path: YamlPath;
  readonly label: string;
  readonly schema: SchemaView | null;
  readonly node: YamlNode | null;
  readonly required: boolean;
  readonly lock: FieldLock | null;
}

class FormModelBuilder {
  private readonly issues: SchemaIssue[] = [];

  constructor(private readonly source: string) {}

  build(schema: SchemaView, tree: YamlNode): FormModel {
    const root = this.field({
      path: [],
      label: schema.title ?? "",
      schema,
      node: tree,
      required: true,
      lock: null,
    });
    return {
      title: schema.title,
      root,
      unfilled: schema.unfilledValues,
      schemaIssues: this.issues,
    };
  }

  private field(site: FieldSite): Field {
    const { node, lock } = resolveAliases(site.node, site.lock);
    const located = { ...site, node, lock };
    const kind = this.kindOf(located);
    if (isScalarKind(kind)) return this.scalarField(located, kind);
    if (isMappingKind(kind)) return this.mappingField(located, kind);
    return this.sequenceField(located, kind);
  }

  private kindOf(site: FieldSite): FieldKind {
    if (site.schema === null) return kindOfNode(site.node);
    const { kind, unknownDeclaredKind } = resolveKind(site.schema);
    if (unknownDeclaredKind !== null) {
      this.issues.push({
        path: printFieldPath(site.path),
        message: `The keyword \`x-kind\` names no field kind: \`${unknownDeclaredKind}\`.`,
      });
    }
    return kind ?? kindOfNode(site.node);
  }

  private base(site: FieldSite, fits: boolean): FieldBase {
    return {
      rules: this.rulesOf(site),
      id: printFieldPath(site.path),
      path: site.path,
      label: site.label,
      description: site.schema?.description ?? null,
      examples: site.schema?.examples ?? [],
      required: site.required,
      node: site.node,
      lock: site.lock,
      mismatch: fits ? null : this.textOf(site.node),
    };
  }

  private scalarField(site: FieldSite, kind: ScalarKind): ScalarField {
    const node = site.node;
    const scalar = node === null || node.kind === "scalar";
    return {
      ...this.base(site, scalar),
      kind,
      value: node?.kind === "scalar" ? node.value : null,
      options: kind === "choice" && site.schema ? (choiceOptions(site.schema) ?? []) : [],
    };
  }

  private mappingField(site: FieldSite, kind: MappingKind): MappingField {
    const mapping = site.node?.kind === "mapping" ? site.node : null;
    const entries = mapping === null ? [] : effectiveEntries(mapping, site.lock);
    const schema = site.schema;
    const alternatives = kind === "alternatives" && schema !== null ? schema.oneOf() : [];
    const selected = selectAlternative(alternatives, new Set(entries.map((entry) => entry.key)));
    const chosen = selected === null ? null : (alternatives[selected] ?? null);
    const declared = mergeProperties(schema?.properties() ?? [], chosen?.properties() ?? []);
    const required = new Set([...(schema?.required ?? []), ...(chosen?.required ?? [])]);

    const byKey = new Map(entries.map((entry) => [entry.key, entry]));
    const children: Field[] = declared.map(({ key, schema: property }) => {
      const entry = byKey.get(key);
      return this.field({
        path: [...site.path, key],
        label: property.title ?? keyLabel(key),
        schema: property,
        node: entry?.value ?? null,
        required: required.has(key),
        lock: entry?.lock ?? site.lock,
      });
    });
    const declaredKeys = new Set(declared.map(({ key }) => key));
    const extraEntries: ExtraEntry[] = [];
    for (const entry of entries) {
      if (declaredKeys.has(entry.key)) continue;
      const path = [...site.path, entry.key];
      const property = schema?.schemaOfKey(entry.key) ?? null;
      if (property === null) {
        extraEntries.push({
          id: printFieldPath(path),
          key: entry.key,
          text: this.textOf(entry.value),
        });
      } else {
        children.push(
          this.field({
            path,
            label: entry.key,
            schema: property,
            node: entry.value,
            required: false,
            lock: entry.lock,
          }),
        );
      }
    }
    return {
      ...this.base(site, mapping !== null || isNullValue(site.node)),
      kind,
      children,
      extraEntries,
      alternatives: alternatives.map((alternative) => alternative.title),
      selectedAlternative: selected,
    };
  }

  private sequenceField(site: FieldSite, kind: SequenceKind): SequenceField {
    const sequence = site.node?.kind === "sequence" ? site.node : null;
    const itemSchema = site.schema?.items() ?? null;
    const items = (sequence?.items ?? []).map((item, index) =>
      this.field({
        path: [...site.path, index],
        label: `#${index + 1}`,
        schema: itemSchema,
        node: item,
        required: false,
        lock: site.lock,
      }),
    );
    return { ...this.base(site, sequence !== null || isNullValue(site.node)), kind, items };
  }

  /** Entries of the keyword `x-rules` of the field; a value other than a sequence is reported. */
  private rulesOf(site: FieldSite): readonly JsonValue[] {
    const rules = site.schema?.rules ?? null;
    if (rules === null) return [];
    if (Array.isArray(rules)) return rules as readonly JsonValue[];
    this.issues.push({
      path: printFieldPath(site.path),
      message: "The keyword `x-rules` must hold a sequence of rule declarations.",
    });
    return [];
  }

  private textOf(node: YamlNode | null): string {
    return node?.range ? this.source.slice(node.range.start, node.range.end) : "";
  }
}

/**
 * Label of a declared property without a title: its key, with underscores and hyphens read as
 * spaces (`empty_hint` → `empty hint`). The keys of a mapping admitted by a pattern are data,
 * such as identifiers, so they keep their written form.
 */
function keyLabel(key: string): string {
  const label = key.replace(/[_-]+/g, " ").trim();
  return label === "" ? key : label;
}

/** Kind displaying a value that no schema describes, from the shape of the value. */
function kindOfNode(node: YamlNode | null): FieldKind {
  if (node?.kind === "mapping") return "group";
  if (node?.kind === "sequence") return "list";
  return "text";
}

/** Whether `node` is absent or holds the null value, which fits every kind. */
function isNullValue(node: YamlNode | null): boolean {
  return node === null || (node.kind === "scalar" && node.value === null);
}

/**
 * Position of the alternative that a mapping with `keys` matches: among the alternatives whose
 * required keys are all present, the one declaring the most present keys. Returns `null` when
 * no alternative has its required keys, or when the mapping is empty.
 */
function selectAlternative(
  alternatives: readonly SchemaView[],
  keys: ReadonlySet<string>,
): number | null {
  let best: number | null = null;
  let bestScore = 0;
  alternatives.forEach((alternative, index) => {
    if (![...alternative.required].every((key) => keys.has(key))) return;
    const score = alternative.properties().filter(({ key }) => keys.has(key)).length;
    if (score > bestScore) {
      best = index;
      bestScore = score;
    }
  });
  return best;
}

/** Properties of a parent followed by those of its selected alternative, each key once. */
function mergeProperties(
  parent: readonly PropertySchema[],
  alternative: readonly PropertySchema[],
): PropertySchema[] {
  const keys = new Set(parent.map(({ key }) => key));
  return [...parent, ...alternative.filter(({ key }) => !keys.has(key))];
}
