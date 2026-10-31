/**
 * Set of schema documents loaded for one instance: the root schema and every document that its
 * references reach.
 *
 * Every `$ref` of every document is checked when the set is built, so a broken reference is
 * reported once, at loading, and the interpretation of the schema never meets one.
 *
 * A `$ref` by absolute URI designates the document that the key `resources` of the schema
 * registry maps to that URI, else the loaded document whose root `$id` is that URI.
 */
import { SchemaLoadError, SchemaReferenceError } from "../../errors";
import { isJsonObject, type JsonObject, type JsonValue } from "./json";
import { evaluatePointer, findAnchor, parseReference, visitObjects } from "./reference";

/** A parsed schema file. */
export interface SchemaDocument {
  /** Vault path of the file. */
  readonly path: string;
  readonly root: JsonValue;
}

/** A schema value, with the document whose folder resolves its relative references. */
export interface LocatedSchema {
  readonly value: JsonValue;
  readonly document: string;
}

/** Keywords of one object along a chain of `$ref`, without the keyword `$ref` itself. */
export interface SchemaLayer {
  readonly keywords: JsonObject;
  readonly document: string;
  /** Object written in the document, `$ref` included, which identifies the layer. */
  readonly written: JsonObject;
}

/**
 * Keywords of a schema together with those of every schema that it composes, through `$ref` and
 * the subschemas of `allOf`, each object once.
 */
export interface Composition {
  /**
   * Layers in the order of lookup, nearest first: breadth-first from the schema, the target of
   * the `$ref` of each layer before the subschemas of its `allOf`, in their written order.
   */
  readonly layers: readonly SchemaLayer[];
  /**
   * The same layers, each after the layers that it composes (depth-first post-order), so that
   * the declarations of a base precede those of the schema extending it.
   */
  readonly basesFirst: readonly SchemaLayer[];
  /** Whether a composed subschema is `false`, so that the composition admits no value. */
  readonly rejectsAll: boolean;
}

/** Absolute URIs resolved through the schema registry while loading, with that registry. */
export interface ResolvedResources {
  readonly registryPath: string | null;
  /** Each absolute `$id` with the vault path of the document that the registry maps to it. */
  readonly documents: ReadonlyMap<string, string>;
}

/** Bound on the length of a chain of `$ref`, beyond which the chain counts as a loop. */
const MAX_REFERENCE_CHAIN = 64;

const NO_RESOURCES: ResolvedResources = { registryPath: null, documents: new Map() };

export class SchemaSet {
  private readonly documents: ReadonlyMap<string, JsonValue>;
  private readonly identifiers: ReadonlyMap<string, string>;
  private readonly compositions = new WeakMap<object, Composition>();

  /**
   * @throws SchemaLoadError When the root document is absent from `documents`.
   * @throws SchemaReferenceError When a `$ref` designates no schema, or loops.
   */
  constructor(
    readonly rootPath: string,
    documents: readonly SchemaDocument[],
    private readonly resources: ResolvedResources = NO_RESOURCES,
  ) {
    this.documents = new Map(documents.map((document) => [document.path, document.root]));
    this.identifiers = new Map(
      documents.flatMap(({ path, root }) => {
        const id = isJsonObject(root) ? root["$id"] : undefined;
        return typeof id === "string" ? [[id, path] as const] : [];
      }),
    );
    if (!this.documents.has(rootPath)) {
      throw new SchemaLoadError(`The root schema \`${rootPath}\` was not loaded.`, rootPath);
    }
    for (const { path, root } of documents) {
      visitObjects(root, (object) => {
        if (typeof object["$ref"] === "string") this.layers({ value: object, document: path });
      });
    }
  }

  /** Vault paths of the documents of the set, root first. */
  get paths(): readonly string[] {
    return [this.rootPath, ...[...this.documents.keys()].filter((path) => path !== this.rootPath)];
  }

  /**
   * Vault paths whose change can change the set: its documents, root first, then the schema
   * registry consulted for absolute URIs, if any.
   */
  get dependencies(): readonly string[] {
    const registry = this.resources.registryPath;
    return registry === null ? this.paths : [...this.paths, registry];
  }

  /** Parsed root of the document at the vault path `path`, or `undefined` when not loaded. */
  document(path: string): JsonValue | undefined {
    return this.documents.get(path);
  }

  /**
   * Vault path of the loaded document designated by `target`, a vault path or the `$id` of a
   * document, or `null` when no loaded document matches.
   */
  documentPath(target: string): string | null {
    if (this.documents.has(target)) return target;
    return this.resources.documents.get(target) ?? this.identifiers.get(target) ?? null;
  }

  get root(): LocatedSchema {
    return { value: this.documents.get(this.rootPath) ?? true, document: this.rootPath };
  }

  /**
   * Follows the chain of `$ref` starting at `schema`, and returns the keywords met along it,
   * nearest first, so a keyword written beside a `$ref` overrides the referenced one. Returns
   * `null` for the schema `false`, which admits no value.
   *
   * @throws SchemaReferenceError When a reference designates no schema, or the chain loops.
   */
  layers(schema: LocatedSchema): SchemaLayer[] | null {
    const layers: SchemaLayer[] = [];
    let current = schema;
    for (let step = 0; step < MAX_REFERENCE_CHAIN; step += 1) {
      if (current.value === false) return null;
      if (!isJsonObject(current.value)) return layers;
      const { $ref: reference, ...keywords } = current.value;
      layers.push({ keywords, document: current.document, written: current.value });
      if (typeof reference !== "string") return layers;
      current = this.locate(reference, current.document);
    }
    throw new SchemaReferenceError(
      `A chain of \`$ref\` starting in \`${schema.document}\` loops without reaching a schema.`,
      schema.document,
    );
  }

  /**
   * Composition of the conjunction of `schemas`, the first nearest: the layers of each schema,
   * of its `$ref` target and of the subschemas of its `allOf`, recursively. A subschema met
   * again, as in a recursive schema, is not expanded twice.
   */
  compose(schemas: readonly LocatedSchema[]): Composition {
    const [only] = schemas;
    if (schemas.length === 1 && only !== undefined && isJsonObject(only.value)) {
      const cached = this.compositions.get(only.value);
      if (cached !== undefined) return cached;
      const composition = this.expand(schemas);
      this.compositions.set(only.value, composition);
      return composition;
    }
    return this.expand(schemas);
  }

  private expand(schemas: readonly LocatedSchema[]): Composition {
    interface Node {
      readonly layer: SchemaLayer;
      readonly parts: readonly Node[];
    }
    const seen = new Set<object>();
    let rejectsAll = false;
    const node = (schema: LocatedSchema): Node | null => {
      if (schema.value === false) rejectsAll = true;
      if (!isJsonObject(schema.value) || seen.has(schema.value)) return null;
      seen.add(schema.value);
      const { $ref: reference, ...keywords } = schema.value;
      const composed: LocatedSchema[] = [];
      if (typeof reference === "string") composed.push(this.locate(reference, schema.document));
      const allOf = keywords["allOf"];
      if (Array.isArray(allOf)) {
        for (const value of allOf as readonly JsonValue[]) {
          composed.push({ value, document: schema.document });
        }
      }
      return {
        layer: { keywords, document: schema.document, written: schema.value },
        parts: composed.map(node).filter((part) => part !== null),
      };
    };
    const roots = schemas.map(node).filter((root) => root !== null);
    const layers: SchemaLayer[] = [];
    for (let level = roots; level.length > 0; level = level.flatMap((entry) => entry.parts)) {
      layers.push(...level.map((entry) => entry.layer));
    }
    const basesFirst: SchemaLayer[] = [];
    const visit = (entry: Node): void => {
      entry.parts.forEach(visit);
      basesFirst.push(entry.layer);
    };
    [...roots].reverse().forEach(visit);
    return { layers, basesFirst, rejectsAll };
  }

  /** Schema designated by `reference`, written in the document `from`. */
  private locate(reference: string, from: string): LocatedSchema {
    const fail = (reason: string): never => {
      throw new SchemaReferenceError(
        `The \`$ref\` \`${reference}\` in \`${from}\` ${reason}.`,
        from,
      );
    };
    const target = parseReference(reference, from) ?? fail("leaves the vault");
    const path =
      target.document === null
        ? from
        : (this.documentPath(target.document) ?? fail("designates no loaded schema file"));
    const root = this.documents.get(path) ?? fail("designates no loaded schema file");
    const value =
      target.fragment === "" || target.fragment.startsWith("/")
        ? evaluatePointer(root, target.fragment)
        : findAnchor(root, target.fragment);
    return value === undefined ? fail("designates no schema") : { value, document: path };
  }
}
