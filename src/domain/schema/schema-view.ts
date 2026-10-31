/**
 * Read access to the keywords of one subschema, with its references and its compositions
 * followed.
 *
 * A view reads the layers of a composition: the subschema, the target of its `$ref` and the
 * subschemas of its `allOf`, recursively, as `SchemaSet.compose` orders them. Each keyword falls
 * into one of two classes:
 *
 * - an annotation (`title`, `description`, `examples`, and the keywords of ekphrasis other than
 *   `x-rules`) takes its nearest declaration, so a keyword written beside a `$ref` or in a schema
 *   composing another by `allOf` overrides the composed one;
 * - a constraint holds in every layer, so the view merges its declarations: `properties`,
 *   `required`, `dependentRequired`, `type`, `enum`, `items`, the subschemas of keys absent from
 *   `properties`, `uniqueItems` and `x-rules`.
 *
 * The keywords `const` and `oneOf` take their nearest declaration. The admitted values of a field
 * of kind `choice` intersect the enumerations of every layer, read through `parts`.
 *
 * Each subschema reached through a keyword (a property, the items, an alternative) becomes a view
 * located in the document that wrote it, so its own relative references resolve from the right
 * folder. A property declared by several layers becomes one view of the conjunction of its
 * declarations, nearest first.
 */
import { isJsonObject, isJsonScalar, jsonEquals, type JsonScalar, type JsonValue } from "./json";
import type { Composition, LocatedSchema, SchemaLayer, SchemaSet } from "./schema-set";

/** A property declared under the keyword `properties`, with its subschema. */
export interface PropertySchema {
  readonly key: string;
  readonly schema: SchemaView;
}

export class SchemaView {
  private constructor(
    private readonly set: SchemaSet,
    /** Schemas whose conjunction the view reads, nearest first. */
    private readonly conjuncts: readonly LocatedSchema[],
    private readonly composition: Composition,
  ) {}

  /** View of the root schema of `set`. */
  static root(set: SchemaSet): SchemaView {
    return SchemaView.of(set, [set.root]);
  }

  /**
   * View of the conjunction of `views`, which must read one schema set; the first view is the
   * nearest, so its annotations override those of the others.
   */
  static conjoin(views: readonly [SchemaView, ...SchemaView[]]): SchemaView {
    const [first] = views;
    if (views.length === 1) return first;
    return SchemaView.of(
      first.set,
      views.flatMap((view) => view.conjuncts),
    );
  }

  private static of(set: SchemaSet, conjuncts: readonly LocatedSchema[]): SchemaView {
    return new SchemaView(set, conjuncts, set.compose(conjuncts));
  }

  /** Whether the subschema admits no value: it, or a subschema that it composes, is `false`. */
  get rejectsAll(): boolean {
    return this.composition.rejectsAll;
  }

  /**
   * One view per layer of the composition, nearest first, each reading the keywords of its layer
   * alone. A merge that keeps the provenance of each declaration, such as the intersection of
   * admitted values, reads these parts.
   */
  parts(): SchemaView[] {
    return this.composition.layers.map(
      (layer) =>
        new SchemaView(this.set, [{ value: layer.written, document: layer.document }], {
          layers: [layer],
          basesFirst: [layer],
          rejectsAll: false,
        }),
    );
  }

  // --- Annotations -------------------------------------------------------------------------------

  get title(): string | null {
    return this.string("title");
  }

  get description(): string | null {
    return this.string("description");
  }

  get examples(): readonly JsonValue[] {
    const examples = this.keyword("examples")?.value;
    return Array.isArray(examples) ? (examples as readonly JsonValue[]) : [];
  }

  /** Whether the keyword `x-collapsed` holds `true`, folding the field when the form opens. */
  get collapsed(): boolean {
    return this.keyword("x-collapsed")?.value === true;
  }

  /** Value written under the keyword `x-align`, unchecked. */
  get declaredAlign(): string | null {
    return this.string("x-align");
  }

  /**
   * Value written under the keyword `x-identifier`, unchecked, or `null` when it is absent. A
   * well-formed value, read at the root schema, is the field path of the identifier of a record.
   */
  get declaredIdentifier(): JsonValue | null {
    return this.keyword("x-identifier")?.value ?? null;
  }

  /** Name written under the keyword `x-kind`, unchecked. */
  get declaredKind(): string | null {
    return this.string("x-kind");
  }

  // --- Values ------------------------------------------------------------------------------------

  /**
   * Names of the keyword `type` admitted by every layer declaring one, in the order of their
   * nearest declaration; `integer` counts as admitted by `number`. When the layers admit no
   * common name, the names of the nearest declaration, which the form then follows.
   */
  get types(): readonly string[] {
    const declared = this.composition.layers.flatMap((layer) => {
      const names = typeNames(layer.keywords["type"]);
      return names === null ? [] : [names];
    });
    const common = commonTypes(declared);
    return common.length > 0 ? common : (declared[0] ?? []);
  }

  /**
   * Values of the keyword `enum` admitted by every layer declaring one, in the order of their
   * nearest declaration, or `null` when no layer declares it. When the layers admit no common
   * value, the values of the nearest declaration.
   */
  get enumValues(): readonly JsonValue[] | null {
    const declared = this.composition.layers.flatMap((layer) => {
      const values = layer.keywords["enum"];
      return Array.isArray(values) ? [values as readonly JsonValue[]] : [];
    });
    const [nearest, ...others] = declared;
    if (nearest === undefined) return null;
    const common = nearest.filter((value) =>
      others.every((values) => values.some((other) => jsonEquals(other, value))),
    );
    return common.length > 0 ? common : nearest;
  }

  /**
   * Value of the keyword `const`, wrapped so that a constant `null` stays distinguishable. When
   * several layers declare different constants, the nearest one.
   */
  get constValue(): { readonly value: JsonScalar } | null {
    const entry = this.keyword("const");
    return entry !== undefined && isJsonScalar(entry.value) ? { value: entry.value } : null;
  }

  /** Keys required by any layer, in the order of their nearest declaration. */
  get required(): ReadonlySet<string> {
    return new Set(
      this.composition.layers.flatMap((layer) => {
        const required = layer.keywords["required"];
        return Array.isArray(required) ? required.filter((key) => typeof key === "string") : [];
      }),
    );
  }

  /**
   * Keys of the keyword `dependentRequired` of every layer, each with the keys that its presence
   * requires in any layer, in their written order.
   */
  get dependentRequired(): ReadonlyMap<string, readonly string[]> {
    const merged = new Map<string, string[]>();
    for (const layer of this.composition.layers) {
      const entry = layer.keywords["dependentRequired"];
      if (!isJsonObject(entry)) continue;
      for (const [key, keys] of Object.entries(entry)) {
        const names = Array.isArray(keys) ? keys.filter((name) => typeof name === "string") : [];
        const known = merged.get(key) ?? [];
        merged.set(key, [...known, ...names.filter((name) => !known.includes(name))]);
      }
    }
    return merged;
  }

  /** Whether any layer requires unique items. */
  get uniqueItems(): boolean {
    return this.composition.layers.some((layer) => layer.keywords["uniqueItems"] === true);
  }

  /**
   * Values of the keyword `x-unfilled`, counted as unfilled in addition to the null value. The
   * keyword is read at the root schema; an entry may be any JSON value, such as an empty
   * sequence.
   */
  get unfilledValues(): readonly JsonValue[] {
    const values = this.keyword("x-unfilled")?.value;
    return Array.isArray(values) ? (values as readonly JsonValue[]) : [];
  }

  /**
   * Rule declarations of the keyword `x-rules` of every layer, nearest first, unchecked: a rule
   * holds wherever it is declared. The value of a layer other than a sequence is skipped, and
   * reported through `malformedRules`.
   */
  get rules(): readonly JsonValue[] {
    return this.composition.layers.flatMap((layer) => {
      const rules = layer.keywords["x-rules"];
      return Array.isArray(rules) ? (rules as readonly JsonValue[]) : [];
    });
  }

  /** Whether a layer writes under the keyword `x-rules` a value other than a sequence. */
  get malformedRules(): boolean {
    return this.composition.layers.some((layer) => {
      const rules = layer.keywords["x-rules"];
      return rules !== undefined && !Array.isArray(rules);
    });
  }

  // --- Subschemas --------------------------------------------------------------------------------

  /**
   * Properties declared under the keyword `properties` of any layer. A base precedes the schema
   * extending it, and each key keeps the position of its first declaration in that order, so a
   * schema narrowing a property of its base leaves the order of the base unchanged. A key
   * declared by several layers takes the conjunction of its declarations, nearest first.
   */
  properties(): PropertySchema[] {
    const declarations = new Map<string, LocatedSchema[]>();
    for (const layer of this.composition.layers) {
      const properties = layer.keywords["properties"];
      if (!isJsonObject(properties)) continue;
      for (const [key, value] of Object.entries(properties)) {
        const located = { value, document: layer.document };
        declarations.set(key, [...(declarations.get(key) ?? []), located]);
      }
    }
    const keys = new Set(
      this.composition.basesFirst.flatMap((layer) => {
        const properties = layer.keywords["properties"];
        return isJsonObject(properties) ? Object.keys(properties) : [];
      }),
    );
    return [...keys].map((key) => ({
      key,
      schema: SchemaView.of(this.set, declarations.get(key) ?? []),
    }));
  }

  /**
   * Subschema of the items of an array: the conjunction of the keyword `items` of every layer
   * writing a schema object or `true`, or `null` when no layer does.
   */
  items(): SchemaView | null {
    return this.conjunction(
      this.composition.layers.flatMap((layer) => subschemaOf(layer, "items")),
    );
  }

  /**
   * Alternatives of the nearest keyword `oneOf`, in their written order. A `oneOf` of a farther
   * layer applies as well, but the form displays the alternatives of one keyword only.
   */
  oneOf(): SchemaView[] {
    const entry = this.keyword("oneOf");
    if (entry === undefined || !Array.isArray(entry.value)) return [];
    return (entry.value as readonly JsonValue[]).map((value) =>
      SchemaView.of(this.set, [{ value, document: entry.document }]),
    );
  }

  /** Subschemas of the keywords `then` and `else` of every layer, each with its keyword. */
  branches(): { readonly keyword: "then" | "else"; readonly schema: SchemaView }[] {
    return this.composition.layers.flatMap((layer) =>
      (["then", "else"] as const).flatMap((keyword) =>
        subschemaOf(layer, keyword).map((located) => ({
          keyword,
          schema: SchemaView.of(this.set, [located]),
        })),
      ),
    );
  }

  /**
   * Object that identifies the subschema across the views reaching it, or `null` for a
   * subschema written as a boolean. A subschema written as a bare `$ref` is identified with the
   * schema it references, so a recursive schema is recognized when it is reached again. A view
   * of a conjunction is identified by its nearest schema.
   */
  get identity(): object | null {
    const [nearest] = this.conjuncts;
    if (nearest === undefined) return null;
    const chain = this.set.layers(nearest) ?? [];
    const own = chain.find((layer) => Object.keys(layer.keywords).length > 0);
    return (own ?? chain.at(-1))?.written ?? null;
  }

  /**
   * Subschema that keys absent from `properties` take: the conjunction, over the layers, of the
   * only schema of the keyword `patternProperties` of a layer, else the schema of its
   * `additionalProperties`. Returns `null` when no layer declares a schema object.
   */
  dynamicSchema(): SchemaView | null {
    return this.conjunction(
      this.composition.layers.flatMap((layer) => {
        const patterns = layer.keywords["patternProperties"];
        if (isJsonObject(patterns)) {
          const values = Object.values(patterns);
          if (values.length === 1 && values[0] !== undefined) {
            return [{ value: values[0], document: layer.document }];
          }
        }
        return subschemaOf(layer, "additionalProperties");
      }),
    );
  }

  /**
   * Subschema of the key `key`, when the key is absent from `properties`: the conjunction, over
   * the layers, of the schema of the first pattern of `patternProperties` that matches the key,
   * else the schema object of `additionalProperties`. Returns `null` for a key that no schema
   * object describes.
   */
  schemaOfKey(key: string): SchemaView | null {
    return this.conjunction(
      this.composition.layers.flatMap((layer) => {
        const patterns = layer.keywords["patternProperties"];
        if (isJsonObject(patterns)) {
          for (const [pattern, value] of Object.entries(patterns)) {
            if (matchesPattern(pattern, key)) return [{ value, document: layer.document }];
          }
        }
        return subschemaOf(layer, "additionalProperties");
      }),
    );
  }

  // --- Access ------------------------------------------------------------------------------------

  /** Nearest declaration of the keyword `name`, with the document that wrote it. */
  private keyword(name: string): { value: JsonValue; document: string } | undefined {
    for (const layer of this.composition.layers) {
      const value = layer.keywords[name];
      if (value !== undefined) return { value, document: layer.document };
    }
    return undefined;
  }

  private string(name: string): string | null {
    const value = this.keyword(name)?.value;
    return typeof value === "string" ? value : null;
  }

  /** View of the conjunction of `schemas`, or `null` when there is none. */
  private conjunction(schemas: readonly LocatedSchema[]): SchemaView | null {
    return schemas.length === 0 ? null : SchemaView.of(this.set, schemas);
  }
}

/** Schema written as an object or `true` under `name` in `layer`; `false` and absence give none. */
function subschemaOf(layer: SchemaLayer, name: string): LocatedSchema[] {
  const value = layer.keywords[name];
  return value !== undefined && (isJsonObject(value) || value === true)
    ? [{ value, document: layer.document }]
    : [];
}

/**
 * Names of types admitted by every list of `declared`, in the order of their first occurrence;
 * `integer` counts as admitted by `number`. Empty when the lists admit no common type, or when
 * there is no list.
 */
export function commonTypes(declared: readonly (readonly string[])[]): string[] {
  return [...new Set(declared.flat())].filter((name) =>
    declared.every(
      (names) => names.includes(name) || (name === "integer" && names.includes("number")),
    ),
  );
}

/** Names written under the keyword `type`, or `null` when the keyword holds none. */
function typeNames(type: JsonValue | undefined): readonly string[] | null {
  if (typeof type === "string") return [type];
  return Array.isArray(type) ? type.filter((name) => typeof name === "string") : null;
}

/** Whether `key` matches the ECMAScript regular expression `pattern`; invalid patterns fail. */
function matchesPattern(pattern: string, key: string): boolean {
  try {
    return new RegExp(pattern, "u").test(key);
  } catch {
    return false;
  }
}
