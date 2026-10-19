/**
 * Read access to the keywords of one subschema, with its references followed.
 *
 * A view holds the keywords met along a chain of `$ref`, nearest first. Each subschema reached
 * through a keyword (a property, the items, an alternative) becomes a view located in the
 * document that wrote it, so its own relative references resolve from the right folder.
 */
import { isJsonObject, isJsonScalar, type JsonScalar, type JsonValue } from "./json";
import type { LocatedSchema, SchemaLayer, SchemaSet } from "./schema-set";

/** A property declared under the keyword `properties`, with its subschema. */
export interface PropertySchema {
  readonly key: string;
  readonly schema: SchemaView;
}

export class SchemaView {
  private constructor(
    private readonly set: SchemaSet,
    private readonly layers: readonly SchemaLayer[],
    /** Whether the subschema is `false`, which admits no value. */
    readonly rejectsAll: boolean,
  ) {}

  /** View of the root schema of `set`. */
  static root(set: SchemaSet): SchemaView {
    return SchemaView.at(set, set.root);
  }

  private static at(set: SchemaSet, schema: LocatedSchema): SchemaView {
    const layers = set.layers(schema);
    return new SchemaView(set, layers ?? [], layers === null);
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

  /** Name written under the keyword `x-kind`, unchecked. */
  get declaredKind(): string | null {
    return this.string("x-kind");
  }

  // --- Values ------------------------------------------------------------------------------------

  /** Names of the keyword `type`, in their written order. */
  get types(): readonly string[] {
    const type = this.keyword("type")?.value;
    if (typeof type === "string") return [type];
    return Array.isArray(type) ? type.filter((name) => typeof name === "string") : [];
  }

  /** Values of the keyword `enum`, or `null` when it is absent. */
  get enumValues(): readonly JsonValue[] | null {
    const values = this.keyword("enum")?.value;
    return Array.isArray(values) ? (values as readonly JsonValue[]) : null;
  }

  /** Value of the keyword `const`, wrapped so that a constant `null` stays distinguishable. */
  get constValue(): { readonly value: JsonScalar } | null {
    const entry = this.keyword("const");
    return entry !== undefined && isJsonScalar(entry.value) ? { value: entry.value } : null;
  }

  get required(): ReadonlySet<string> {
    const required = this.keyword("required")?.value;
    return new Set(
      Array.isArray(required) ? required.filter((key) => typeof key === "string") : [],
    );
  }

  /**
   * Keys of the keyword `dependentRequired`, each with the keys that its presence requires, in
   * their written order.
   */
  get dependentRequired(): ReadonlyMap<string, readonly string[]> {
    const entry = this.keyword("dependentRequired")?.value;
    if (!isJsonObject(entry)) return new Map();
    return new Map(
      Object.entries(entry).map(([key, keys]) => [
        key,
        Array.isArray(keys) ? keys.filter((name) => typeof name === "string") : [],
      ]),
    );
  }

  get uniqueItems(): boolean {
    return this.keyword("uniqueItems")?.value === true;
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
   * Value of the keyword `x-rules`, unchecked, or `null` when it is absent. A well-formed value
   * is a sequence of rule declarations.
   */
  get rules(): JsonValue | null {
    return this.keyword("x-rules")?.value ?? null;
  }

  // --- Subschemas --------------------------------------------------------------------------------

  /** Properties declared under the keyword `properties`, in their written order. */
  properties(): PropertySchema[] {
    const entry = this.keyword("properties");
    if (entry === undefined || !isJsonObject(entry.value)) return [];
    return Object.entries(entry.value).map(([key, value]) => ({
      key,
      schema: SchemaView.at(this.set, { value, document: entry.document }),
    }));
  }

  /** Subschema of the items of an array, or `null` when the keyword `items` is not a schema. */
  items(): SchemaView | null {
    return this.subschema("items");
  }

  /** Alternatives of the keyword `oneOf`, in their written order. */
  oneOf(): SchemaView[] {
    const entry = this.keyword("oneOf");
    if (entry === undefined || !Array.isArray(entry.value)) return [];
    return (entry.value as readonly JsonValue[]).map((value) =>
      SchemaView.at(this.set, { value, document: entry.document }),
    );
  }

  /** Subschemas of the keywords `then` and `else`, each with the name of its keyword. */
  branches(): { readonly keyword: "then" | "else"; readonly schema: SchemaView }[] {
    return (["then", "else"] as const).flatMap((keyword) => {
      const schema = this.subschema(keyword);
      return schema === null ? [] : [{ keyword, schema }];
    });
  }

  /** Subschemas of the keyword `allOf`, in their written order. */
  allOf(): SchemaView[] {
    const entry = this.keyword("allOf");
    if (entry === undefined || !Array.isArray(entry.value)) return [];
    return (entry.value as readonly JsonValue[]).map((value) =>
      SchemaView.at(this.set, { value, document: entry.document }),
    );
  }

  /**
   * Object that identifies the subschema across the views reaching it, or `null` for a
   * subschema written as a boolean. A subschema written as a bare `$ref` is identified with the
   * schema it references, so a recursive schema is recognized when it is reached again.
   */
  get identity(): object | null {
    const own = this.layers.find((layer) => Object.keys(layer.keywords).length > 0);
    return (own ?? this.layers.at(-1))?.written ?? null;
  }

  /**
   * Subschema that keys absent from `properties` take: the only schema of `patternProperties`,
   * else the schema of `additionalProperties`. Returns `null` when no schema object declares it.
   */
  dynamicSchema(): SchemaView | null {
    const patterns = this.keyword("patternProperties");
    if (patterns !== undefined && isJsonObject(patterns.value)) {
      const values = Object.values(patterns.value);
      if (values.length === 1 && values[0] !== undefined) {
        return SchemaView.at(this.set, { value: values[0], document: patterns.document });
      }
    }
    return this.subschema("additionalProperties");
  }

  /**
   * Subschema of the key `key`, when the key is absent from `properties`: the schema of the
   * first pattern of `patternProperties` that matches the key, else the schema object of
   * `additionalProperties`. Returns `null` for a key that no schema object describes.
   */
  schemaOfKey(key: string): SchemaView | null {
    const patterns = this.keyword("patternProperties");
    if (patterns !== undefined && isJsonObject(patterns.value)) {
      for (const [pattern, value] of Object.entries(patterns.value)) {
        if (matchesPattern(pattern, key)) {
          return SchemaView.at(this.set, { value, document: patterns.document });
        }
      }
    }
    return this.subschema("additionalProperties");
  }

  // --- Access ------------------------------------------------------------------------------------

  private keyword(name: string): { value: JsonValue; document: string } | undefined {
    for (const layer of this.layers) {
      const value = layer.keywords[name];
      if (value !== undefined) return { value, document: layer.document };
    }
    return undefined;
  }

  private string(name: string): string | null {
    const value = this.keyword(name)?.value;
    return typeof value === "string" ? value : null;
  }

  /** Subschema written as an object or `true` under `name`; `false` and absence give `null`. */
  private subschema(name: string): SchemaView | null {
    const entry = this.keyword(name);
    if (entry === undefined || !(isJsonObject(entry.value) || entry.value === true)) return null;
    return SchemaView.at(this.set, { value: entry.value, document: entry.document });
  }
}

/** Whether `key` matches the ECMAScript regular expression `pattern`; invalid patterns fail. */
function matchesPattern(pattern: string, key: string): boolean {
  try {
    return new RegExp(pattern, "u").test(key);
  } catch {
    return false;
  }
}
