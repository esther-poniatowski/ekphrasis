/**
 * Construction of the form model from a schema set and the parsed tree of an instance.
 */
import type { YamlNode, YamlPath } from "../model";
import { printFieldPath } from "../paths/field-path";
import type { PropertySchema } from "../schema/schema-view";
import { SchemaView } from "../schema/schema-view";
import type { JsonValue } from "../schema/json";
import type { SchemaSet } from "../schema/schema-set";
import { UnfilledValues } from "../validation/unfilled";
import { effectiveEntries, resolveAliases } from "./entries";
import { ItemIdentities } from "./item-identities";
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

/**
 * Builds the form model of the instance `tree`, parsed from `source`, under `schemas`. The items
 * of sequences take their identifiers from `identities`, so a model rebuilt after a structural
 * commit keeps the identifier of each item.
 */
export function buildFormModel(
  schemas: SchemaSet,
  tree: YamlNode,
  source: string,
  identities: ItemIdentities = new ItemIdentities(),
): FormModel {
  return new FormModelBuilder(source, identities).build(SchemaView.root(schemas), tree);
}

/**
 * Bound on the nesting of absent templates (the next item of a sequence, the new entry of a
 * keyed mapping), so the templates of a recursive schema terminate.
 */
const MAX_TEMPLATE_DEPTH = 4;

/** Position of one field: its path, its schema, its node and the context set by its parent. */
interface FieldSite {
  readonly path: YamlPath;
  readonly identity: readonly string[];
  /** Number of absent templates among the ancestors of the field. */
  readonly templates: number;
  readonly label: string;
  readonly schema: SchemaView | null;
  readonly node: YamlNode | null;
  readonly required: boolean;
  readonly lock: FieldLock | null;
}

class FormModelBuilder {
  private readonly issues: SchemaIssue[] = [];
  private unfilled = new UnfilledValues([]);

  constructor(
    private readonly source: string,
    private readonly identities: ItemIdentities,
  ) {}

  build(schema: SchemaView, tree: YamlNode): FormModel {
    this.unfilled = new UnfilledValues(schema.unfilledValues);
    const root = this.field({
      path: [],
      identity: [],
      templates: 0,
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
      key: site.identity.at(-1) ?? "",
      identity: site.identity,
      uid: printFieldPath(site.identity),
      label: site.label,
      description: site.schema?.description ?? null,
      examples: site.schema?.examples ?? [],
      required: site.required,
      node: site.node,
      lock: site.lock,
      mismatch: fits ? null : this.textOf(site.node),
      unfilled: this.isUnfilled(site.node),
    };
  }

  private scalarField(site: FieldSite, kind: ScalarKind): ScalarField {
    const node = site.node;
    const scalar = node === null || node.kind === "scalar";
    const value = node?.kind === "scalar" ? node.value : null;
    const options = kind === "choice" && site.schema ? (choiceOptions(site.schema) ?? []) : [];
    return {
      ...this.base(site, scalar),
      kind,
      value,
      options: options.filter((option) => !this.unfilled.has(option.value)),
      align: kind === "latex" && site.schema?.declaredAlign === "left" ? "left" : "center",
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
    const declaredFields = (
      properties: readonly PropertySchema[],
      requiredKeys: ReadonlySet<string>,
    ): Field[] =>
      properties.flatMap(({ key, schema: property }) => {
        if (site.path.length === 0 && key === "_schema") return [];
        const entry = byKey.get(key);
        return [
          this.field({
            ...this.childSite(site, key),
            label: property.title ?? keyLabel(key),
            schema: property,
            node: entry?.value ?? null,
            required: requiredKeys.has(key),
            lock: entry?.lock ?? site.lock,
          }),
        ];
      });
    const children = declaredFields(declared, required);
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
            ...this.childSite(site, entry.key),
            label: entry.key,
            schema: property,
            node: entry.value,
            required: false,
            lock: entry.lock,
          }),
        );
      }
    }
    const alternativeChildren = alternatives.map((alternative, index) =>
      index === selected
        ? children
        : declaredFields(
            mergeProperties(schema?.properties() ?? [], alternative.properties()),
            new Set([...(schema?.required ?? []), ...alternative.required]),
          ),
    );
    return {
      ...this.base(site, mapping !== null || this.isUnfilledScalar(site.node)),
      kind,
      children,
      extraEntries,
      alternatives: alternatives.map((alternative) => alternative.title),
      selectedAlternative: selected,
      alternativeChildren,
      entryTemplate: this.entryTemplate(site, kind),
      collapsed: schema?.collapsed ?? false,
    };
  }

  /** Site of the entry `key` of the mapping at `site`, before its schema and its node. */
  private childSite(
    site: FieldSite,
    key: string,
  ): Pick<FieldSite, "path" | "identity" | "templates"> {
    return {
      path: [...site.path, key],
      identity: [...site.identity, key],
      templates: site.templates,
    };
  }

  /** Absent entry of a mapping keyed by identifiers, placed under the key `""`. */
  private entryTemplate(site: FieldSite, kind: MappingKind): Field | null {
    if (kind !== "keyed-table" && kind !== "keyed-records") return null;
    const schema = site.schema?.dynamicSchema() ?? null;
    if (schema === null || site.templates >= MAX_TEMPLATE_DEPTH) return null;
    return this.field({
      path: [...site.path, ""],
      identity: [...site.identity, ""],
      templates: site.templates + 1,
      label: "",
      schema,
      node: null,
      required: false,
      lock: site.lock,
    });
  }

  private sequenceField(site: FieldSite, kind: SequenceKind): SequenceField {
    const sequence = site.node?.kind === "sequence" ? site.node : null;
    const itemSchema = site.schema?.items() ?? null;
    const nodes = sequence?.items ?? [];
    const identifiers = this.identities.of(printFieldPath(site.identity), nodes.length);
    const item = (index: number, node: YamlNode | null, identifier: string, templates: number) =>
      this.field({
        path: [...site.path, index],
        identity: [...site.identity, identifier],
        templates,
        label: `#${index + 1}`,
        schema: itemSchema,
        node,
        required: false,
        lock: site.lock,
      });
    const items = nodes.map((node, index) =>
      item(index, node, identifiers.items[index] ?? "", site.templates),
    );
    const next =
      site.templates < MAX_TEMPLATE_DEPTH
        ? item(nodes.length, null, identifiers.next, site.templates + 1)
        : null;
    return {
      ...this.base(site, sequence !== null || this.isUnfilledScalar(site.node)),
      kind,
      items,
      next,
      collapsed: site.schema?.collapsed ?? false,
    };
  }

  /**
   * Entries of the keyword `x-rules` of the field, over the subschemas that it composes; a value
   * other than a sequence is reported.
   */
  private rulesOf(site: FieldSite): readonly JsonValue[] {
    if (site.schema === null) return [];
    if (site.schema.malformedRules) {
      this.issues.push({
        path: printFieldPath(site.path),
        message: "The keyword `x-rules` must hold a sequence of rule declarations.",
      });
    }
    return site.schema.rules;
  }

  /** Whether `node` is absent or holds an unfilled scalar, which fits every kind. */
  private isUnfilledScalar(node: YamlNode | null): boolean {
    return node === null || (node.kind === "scalar" && this.unfilled.has(node.value));
  }

  /**
   * Whether `node` holds an unfilled value: an unfilled scalar, or an empty collection that the
   * schema declares unfilled, such as `[]`.
   */
  private isUnfilled(node: YamlNode | null): boolean {
    if (node?.kind === "sequence" && node.items.length === 0) return this.unfilled.has([]);
    if (node?.kind === "mapping" && node.entries.length === 0) return this.unfilled.has({});
    return this.isUnfilledScalar(node);
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

/**
 * Properties of a parent followed by those of its selected alternative, each key once. A key
 * declared by both takes the conjunction of the two declarations, the parent nearest.
 */
function mergeProperties(
  parent: readonly PropertySchema[],
  alternative: readonly PropertySchema[],
): PropertySchema[] {
  const own = new Map(alternative.map(({ key, schema }) => [key, schema]));
  const keys = new Set(parent.map(({ key }) => key));
  return [
    ...parent.map(({ key, schema }) => {
      const narrowed = own.get(key);
      return narrowed === undefined
        ? { key, schema }
        : { key, schema: SchemaView.conjoin([schema, narrowed]) };
    }),
    ...alternative.filter(({ key }) => !keys.has(key)),
  ];
}
