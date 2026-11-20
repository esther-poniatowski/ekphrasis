/**
 * Use case that maintains the index of the identifiers of the records of the vault, and resolves
 * an identifier to its file, as the decision on record identifiers records.
 *
 * Each YAML file is indexed through the binding of ekphrasis: the schema bound to the file, by its
 * modeline or by a path rule, names the field of the identifier by the keyword `x-identifier`, and
 * the value of that field in the file is its identifier. A file that is unbound, fails to parse,
 * or is bound to a schema that fails to load or declares no identifier, declares none.
 *
 * The same reading keeps the value of each record bound through its binding key, under its
 * logical contract, so the entries that a field of kind `reference` names are read from the
 * index without reading the files again. Until the first build completes, a reference receives
 * no entries, so no value is reported for an entry that the index has not seen. A listener learns
 * when the entries of a reference already asked for change, so the open forms can check again.
 *
 * The host reports each creation, change, rename and deletion of a file. A change of a schema
 * file indexes again every file bound to a schema that reads it, since its identifier field may
 * have changed. A change of the path rules calls for a rebuild.
 */
import {
  EntryIndex,
  IdentifierIndex,
  identifierDeclaration,
  instanceValue,
  readIdentifier,
  declaredContract,
  SchemaView,
  type EntryReference,
  type IdentifierResolution,
  type JsonValue,
  type ReferenceEntries,
  type YamlNode,
  type YamlPath,
} from "../domain";
import { SchemaError, YamlParseError } from "../errors";
import type { DocumentParser, FileSource, RecordIdentifiers, SchemaLoader } from "./protocols";
import { BindingService } from "./binding-service";
import type { EkphrasisSettings } from "./settings";

/** Field of the identifier declared by one schema, with the schema files read to find it. */
interface SchemaDeclaration {
  /** Path of the identifier field, or `null` when the schema declares none or fails to load. */
  readonly field: YamlPath | null;
  /** Vault paths of the schema files read and of the registry consulted, or of the failure. */
  readonly documents: readonly string[];
  /** Logical record contract declared by the root property of the binding key. */
  readonly contract: string | null;
}

/** Identifier and record declared by one file, with the schema files on which they depend. */
interface FileDeclaration {
  readonly identifier: string | null;
  /** Value of a record bound through its binding key, with that logical contract. */
  readonly record: { readonly contract: string; readonly value: JsonValue } | null;
  readonly dependencies: readonly string[];
}

/** Reference asked for by a form, with the entries last answered, compared as JSON text. */
interface QueriedReference {
  readonly reference: EntryReference;
  answer: string;
}

export class IdentifierIndexService implements RecordIdentifiers {
  private readonly bindings: BindingService;
  private readonly index = new IdentifierIndex();
  /** Schema files read to index each file, so a change of one indexes the file again. */
  private readonly dependencies = new Map<string, readonly string[]>();
  /** Declaration of each schema, by the vault path of its root file, loaded once. */
  private readonly declarations = new Map<string, Promise<SchemaDeclaration>>();
  /**
   * Number of the latest indexing of each file, drawn from one counter, so an indexing that
   * completes after a later one, a removal or a rebuild, records nothing.
   */
  private readonly generations = new Map<string, number>();
  private counter = 0;
  /** Records bound through their binding key, from which references read their entries. */
  private readonly entries = new EntryIndex();
  /** Whether a build of the whole index has completed, and no rebuild runs. */
  private ready = false;
  /** References asked for, keyed by their JSON text, so a change of their entries is notified. */
  private readonly queried = new Map<string, QueriedReference>();
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly parser: DocumentParser,
    private readonly files: FileSource,
    private readonly schemas: SchemaLoader,
    private readonly settings: () => EkphrasisSettings,
  ) {
    this.bindings = new BindingService(parser, files, settings);
  }

  resolve(identifier: string): IdentifierResolution {
    return this.index.resolve(identifier);
  }

  /** Identifier declared by the file at `path`, as last indexed, or `null`. */
  identifierOf(path: string): string | null {
    return this.index.identifierOf(path);
  }

  /**
   * Entries named by `reference` in the records of the vault, or `null` until a build of the
   * whole index completes. The reference is remembered, so a later change of its entries reaches
   * the listeners.
   */
  referenceEntries(reference: EntryReference): ReferenceEntries | null {
    if (!this.ready) return null;
    const entries = this.entries.entries(reference);
    this.queried.set(JSON.stringify(reference), { reference, answer: JSON.stringify(entries) });
    return entries;
  }

  /**
   * Calls `listener` after a build of the whole index, and after each change of the entries of a
   * reference already asked for. Returns the function that stops the calls.
   */
  onReferencesChanged(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Forgets every file and every schema, then indexes the files at `paths`. */
  async rebuild(paths: readonly string[]): Promise<void> {
    this.ready = false;
    this.index.clear();
    this.entries.clear();
    this.dependencies.clear();
    this.declarations.clear();
    this.generations.clear();
    await Promise.all(paths.map((path) => this.indexFile(path)));
    this.ready = true;
    this.listeners.forEach((listener) => listener());
  }

  /** Indexes the file at `path`, created or changed. */
  async indexFile(path: string): Promise<void> {
    const generation = this.nextGeneration(path);
    const declaration = await this.declarationOf(path);
    if (this.generations.get(path) !== generation) return;
    this.index.declare(path, declaration.identifier);
    const before = this.entries.contractOf(path);
    this.entries.declare(path, declaration.record);
    this.dependencies.set(path, declaration.dependencies);
    this.entriesChanged([before, declaration.record?.contract ?? null]);
  }

  /** Forgets the file at `path`, deleted. */
  removeFile(path: string): void {
    this.nextGeneration(path);
    this.index.remove(path);
    const before = this.entries.contractOf(path);
    this.entries.remove(path);
    this.dependencies.delete(path);
    this.entriesChanged([before]);
  }

  /**
   * Notifies the listeners when the entries of a reference already asked for, among those of the
   * logical contracts `contracts`, differ from the entries last answered.
   */
  private entriesChanged(contracts: readonly (string | null)[]): void {
    if (!this.ready) return;
    let changed = false;
    for (const queried of this.queried.values()) {
      if (!contracts.includes(queried.reference.schema)) continue;
      const answer = JSON.stringify(this.entries.entries(queried.reference));
      if (answer === queried.answer) continue;
      queried.answer = answer;
      changed = true;
    }
    if (changed) this.listeners.forEach((listener) => listener());
  }

  /**
   * Moves the file from `oldPath` to `newPath`, then indexes it again, since its new path may
   * match another path rule.
   */
  async renameFile(oldPath: string, newPath: string): Promise<void> {
    this.removeFile(oldPath);
    await this.indexFile(newPath);
  }

  /**
   * Indexes again every file whose identifier depends on the file at `path`, created, changed,
   * renamed or deleted, when that file is a schema file read by its binding.
   */
  async dependencyChanged(path: string): Promise<void> {
    for (const [schemaPath, declaration] of [...this.declarations]) {
      const documents = await declaration.then(
        (loaded) => loaded.documents,
        () => [schemaPath],
      );
      if (schemaPath === path || documents.includes(path)) this.declarations.delete(schemaPath);
    }
    const dependents = [...this.dependencies]
      .filter(([, documents]) => documents.includes(path))
      .map(([file]) => file);
    await Promise.all(dependents.map((file) => this.indexFile(file)));
  }

  private nextGeneration(path: string): number {
    this.counter += 1;
    this.generations.set(path, this.counter);
    return this.counter;
  }

  private async declarationOf(path: string): Promise<FileDeclaration> {
    const none: FileDeclaration = { identifier: null, record: null, dependencies: [] };
    const text = await this.files.read(path);
    if (text === null) return none;
    const result = await this.bindings.resolve(path, text);
    if (result.status === "unbound" || result.status === "invalid") {
      return {
        ...none,
        dependencies: result.registryPath === undefined ? [] : [result.registryPath],
      };
    }
    const schema = await this.schemaDeclaration(result.binding.schemaPath);
    const dependencies = [
      ...(result.binding.registryPath === undefined ? [] : [result.binding.registryPath]),
      ...schema.documents,
    ];
    const contract = result.binding.source === "schema-field" ? result.binding.reference : null;
    if (contract !== null && schema.contract !== contract) return { ...none, dependencies };
    if (schema.field === null && contract === null) return { ...none, dependencies };
    let tree: YamlNode;
    try {
      tree = this.parser.parse(text);
    } catch (error) {
      if (error instanceof YamlParseError) return { ...none, dependencies };
      throw error;
    }
    const value = instanceValue(tree);
    return {
      identifier: schema.field === null ? null : readIdentifier(value, schema.field),
      record: contract === null ? null : { contract, value },
      dependencies,
    };
  }

  private schemaDeclaration(schemaPath: string): Promise<SchemaDeclaration> {
    let declaration = this.declarations.get(schemaPath);
    if (declaration === undefined) {
      declaration = this.loadDeclaration(schemaPath);
      this.declarations.set(schemaPath, declaration);
    }
    return declaration;
  }

  private async loadDeclaration(schemaPath: string): Promise<SchemaDeclaration> {
    try {
      const schemas = await this.schemas.load(schemaPath);
      const declaration = identifierDeclaration(SchemaView.root(schemas));
      const contract = declaredContract(SchemaView.root(schemas), this.settings().bindingKey);
      return {
        field: declaration.status === "declared" ? declaration.path : null,
        documents: schemas.dependencies,
        contract: typeof contract === "string" ? contract : null,
      };
    } catch (error) {
      if (!(error instanceof SchemaError)) throw error;
      return {
        field: null,
        documents: [...new Set([schemaPath, error.schemaPath, ...error.dependencies])],
        contract: null,
      };
    }
  }
}
