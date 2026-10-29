/**
 * Use case that maintains the index of the identifiers of the records of the vault, and resolves
 * an identifier to its file, as the decision on record identifiers records.
 *
 * Each YAML file is indexed through the binding of ekphrasis: the schema bound to the file, by its
 * modeline or by a path rule, names the field of the identifier by the keyword `x-identifier`, and
 * the value of that field in the file is its identifier. A file that is unbound, fails to parse,
 * or is bound to a schema that fails to load or declares no identifier, declares none.
 *
 * The host reports each creation, change, rename and deletion of a file. A change of a schema
 * file indexes again every file bound to a schema that reads it, since its identifier field may
 * have changed. A change of the path rules calls for a rebuild.
 */
import {
  IdentifierIndex,
  identifierDeclaration,
  instanceValue,
  readIdentifier,
  SchemaView,
  type IdentifierResolution,
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
  /** Vault paths of the schema files read, or of the file that failed to load. */
  readonly documents: readonly string[];
  /** Logical record contract declared by the root `_schema` property. */
  readonly contract: string | null;
}

/** Identifier declared by one file, with the schema files on which it depends. */
interface FileDeclaration {
  readonly identifier: string | null;
  readonly dependencies: readonly string[];
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

  constructor(
    private readonly parser: DocumentParser,
    private readonly files: FileSource,
    private readonly schemas: SchemaLoader,
    settings: () => EkphrasisSettings,
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

  /** Forgets every file and every schema, then indexes the files at `paths`. */
  async rebuild(paths: readonly string[]): Promise<void> {
    this.index.clear();
    this.dependencies.clear();
    this.declarations.clear();
    this.generations.clear();
    await Promise.all(paths.map((path) => this.indexFile(path)));
  }

  /** Indexes the file at `path`, created or changed. */
  async indexFile(path: string): Promise<void> {
    const generation = this.nextGeneration(path);
    const declaration = await this.declarationOf(path);
    if (this.generations.get(path) !== generation) return;
    this.index.declare(path, declaration.identifier);
    this.dependencies.set(path, declaration.dependencies);
  }

  /** Forgets the file at `path`, deleted. */
  removeFile(path: string): void {
    this.nextGeneration(path);
    this.index.remove(path);
    this.dependencies.delete(path);
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
    const none: FileDeclaration = { identifier: null, dependencies: [] };
    const text = await this.files.read(path);
    if (text === null) return none;
    const result = await this.bindings.resolve(path, text);
    if (result.status === "unbound") return none;
    if (result.status === "invalid") {
      return {
        identifier: null,
        dependencies: result.registryPath === undefined ? [] : [result.registryPath],
      };
    }
    const schema = await this.schemaDeclaration(result.binding.schemaPath);
    const dependencies = [
      ...(result.binding.registryPath === undefined ? [] : [result.binding.registryPath]),
      ...schema.documents,
    ];
    if (result.binding.source === "schema-field" && schema.contract !== result.binding.reference) {
      return { identifier: null, dependencies };
    }
    if (schema.field === null) return { identifier: null, dependencies };
    let tree: YamlNode;
    try {
      tree = this.parser.parse(text);
    } catch (error) {
      if (error instanceof YamlParseError) return { identifier: null, dependencies };
      throw error;
    }
    return { identifier: readIdentifier(instanceValue(tree), schema.field), dependencies };
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
      const contract = SchemaView.root(schemas)
        .properties()
        .find(({ key }) => key === "_schema")?.schema.constValue?.value;
      return {
        field: declaration.status === "declared" ? declaration.path : null,
        documents: schemas.paths,
        contract: typeof contract === "string" ? contract : null,
      };
    } catch (error) {
      if (!(error instanceof SchemaError)) throw error;
      return {
        field: null,
        documents: [...new Set([schemaPath, error.schemaPath])],
        contract: null,
      };
    }
  }
}
