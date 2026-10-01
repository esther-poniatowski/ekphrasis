/**
 * Set of schema documents loaded for one instance: the root schema and every document that its
 * references reach.
 *
 * Every `$ref` of every document is checked when the set is built, so a broken reference is
 * reported once, at loading, and the interpretation of the schema never meets one.
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
}

/** Bound on the length of a chain of `$ref`, beyond which the chain counts as a loop. */
const MAX_REFERENCE_CHAIN = 64;

export class SchemaSet {
  private readonly documents: ReadonlyMap<string, JsonValue>;
  private readonly identifiers: ReadonlyMap<string, string>;

  /**
   * @throws SchemaLoadError When the root document is absent from `documents`.
   * @throws SchemaReferenceError When a `$ref` designates no schema, or loops.
   */
  constructor(
    readonly rootPath: string,
    documents: readonly SchemaDocument[],
  ) {
    this.documents = new Map(documents.map((document) => [document.path, document.root]));
    this.identifiers = new Map(
      documents.flatMap(({ path, root }) => {
        const id = isJsonObject(root) ? root["$id"] : undefined;
        return typeof id === "string" ? [[id, path] as const] : [];
      }),
    );
    if (!this.documents.has(rootPath)) {
      throw new SchemaLoadError(`The root schema "${rootPath}" was not loaded.`, rootPath);
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
      layers.push({ keywords, document: current.document });
      if (typeof reference !== "string") return layers;
      current = this.locate(reference, current.document);
    }
    throw new SchemaReferenceError(
      `A chain of $ref starting in "${schema.document}" loops without reaching a schema.`,
      schema.document,
    );
  }

  /** Schema designated by `reference`, written in the document `from`. */
  private locate(reference: string, from: string): LocatedSchema {
    const fail = (reason: string): never => {
      throw new SchemaReferenceError(`The $ref "${reference}" in "${from}" ${reason}.`, from);
    };
    const target = parseReference(reference, from) ?? fail("leaves the vault");
    const path =
      target.document === null
        ? from
        : this.documents.has(target.document)
          ? target.document
          : (this.identifiers.get(target.document) ?? fail("designates no loaded schema file"));
    const root = this.documents.get(path) ?? fail("designates no loaded schema file");
    const value =
      target.fragment === "" || target.fragment.startsWith("/")
        ? evaluatePointer(root, target.fragment)
        : findAnchor(root, target.fragment);
    return value === undefined ? fail("designates no schema") : { value, document: path };
  }
}
