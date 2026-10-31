/**
 * Implementation of the `SchemaLoader` port: reads a schema file and every schema file that its
 * references reach, through the `FileSource` port, and parses each one as JSON or YAML.
 *
 * A `$ref` by absolute URI is matched as an exact string. It designates the file that the key
 * `resources` of the schema registry maps to that URI, read through the `SchemaResources` port,
 * else a loaded file whose root `$id` is that URI. No URI is ever fetched over the network.
 */
import { LineCounter, parseDocument } from "yaml";
import type { FileSource, ResourceMapping, SchemaLoader, SchemaResources } from "../../application";
import {
  asJsonValue,
  collectReferences,
  extensionOf,
  isJsonObject,
  isUri,
  parseReference,
  resolveVaultPath,
  SchemaSet,
  type JsonValue,
  type SchemaDocument,
} from "../../domain";
import { SchemaLoadError, SchemaReferenceError } from "../../errors";
import { nameBareSymbols } from "../library-messages";

/** Resources of a loader built without a registry: every absolute URI stays unmapped. */
const NO_REGISTRY: SchemaResources = {
  resources: () =>
    Promise.resolve({ status: "unavailable", reason: "no schema registry is configured" }),
};

export class FileSchemaLoader implements SchemaLoader {
  constructor(
    private readonly files: FileSource,
    private readonly registry: SchemaResources = NO_REGISTRY,
  ) {}

  /**
   * Loads the schema at `path` with the documents that its references reach, in breadth-first
   * order of discovery. The registry is read once, at the first absolute URI met.
   *
   * @throws SchemaLoadError When a file is missing, fails to parse, or holds no JSON value, or
   *   when a file mapped to an absolute URI declares another `$id`.
   * @throws SchemaReferenceError When a `$ref` designates no schema of the loaded documents, or
   *   names an absolute URI that neither the registry nor a loaded `$id` resolves.
   */
  async load(path: string): Promise<SchemaSet> {
    const documents: SchemaDocument[] = [];
    const declared = new Set<string>();
    const queued = new Set([path]);
    const queue: { path: string; referrer: string | null }[] = [{ path, referrer: null }];
    /** Each absolute URI that the registry resolves, with the vault path mapped to it. */
    const resolved = new Map<string, string>();
    /** Absolute URI that the root `$id` of each file mapped by the registry must equal. */
    const expectedIds = new Map<string, string>();
    /** First file referencing each absolute URI that the registry leaves unresolved. */
    const unresolved = new Map<string, string>();
    let mapping: ResourceMapping | null = null;
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      const expected = expectedIds.get(next.path);
      const root = await this.read(
        next.path,
        next.referrer,
        expected === undefined ? [] : registryOf(mapping),
      );
      if (expected !== undefined) checkDeclaredId(root, expected, next.path, mapping);
      documents.push({ path: next.path, root });
      const id = isJsonObject(root) ? root["$id"] : undefined;
      if (typeof id === "string") declared.add(id);
      for (const reference of collectReferences(root)) {
        const target = parseReference(reference, next.path)?.document ?? null;
        if (target === null) continue;
        if (!isUri(target)) {
          if (queued.has(target)) continue;
          queued.add(target);
          queue.push({ path: target, referrer: next.path });
          continue;
        }
        if (resolved.has(target) || unresolved.has(target)) continue;
        mapping ??= await this.registry.resources();
        const file = mapping.status === "available" ? mapping.resources.get(target) : undefined;
        if (file === undefined) {
          unresolved.set(target, next.path);
          continue;
        }
        const filePath = mappedPath(target, file, next.path, mapping);
        resolved.set(target, filePath);
        const loaded = documents.find((document) => document.path === filePath);
        if (loaded !== undefined) checkDeclaredId(loaded.root, target, filePath, mapping);
        else expectedIds.set(filePath, target);
        if (queued.has(filePath)) continue;
        queued.add(filePath);
        queue.push({ path: filePath, referrer: next.path });
      }
    }
    for (const [uri, referrer] of unresolved) {
      if (!declared.has(uri)) throw unresolvedUri(uri, referrer, mapping);
    }
    const registryPath = mapping === null ? null : (mapping.registryPath ?? null);
    return new SchemaSet(path, documents, { registryPath, documents: resolved });
  }

  /** Parsed file at `path`; `dependencies` can repair a missing file, such as the registry. */
  private async read(
    path: string,
    referrer: string | null,
    dependencies: readonly string[] = [],
  ): Promise<JsonValue> {
    const text = await this.files.read(path);
    if (text === null) {
      const origin = referrer === null ? "" : `, referenced from \`${referrer}\`,`;
      throw new SchemaLoadError(
        `The schema file \`${path}\`${origin} does not exist.`,
        path,
        dependencies,
      );
    }
    const value = extensionOf(path) === "json" ? parseJson(text, path) : parseYaml(text, path);
    const json = asJsonValue(value);
    if (json === null) {
      throw new SchemaLoadError(`The schema file \`${path}\` holds a value outside JSON.`, path);
    }
    return json;
  }
}

function parseJson(text: string, path: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    const reason = nameBareSymbols(error instanceof Error ? error.message : String(error));
    throw new SchemaLoadError(`The schema file \`${path}\` is not valid JSON: ${reason}`, path);
  }
}

function parseYaml(text: string, path: string): unknown {
  const lines = new LineCounter();
  const document = parseDocument(text, { prettyErrors: false, lineCounter: lines });
  const [error] = document.errors;
  if (error) {
    const { line, col } = lines.linePos(error.pos[0]);
    throw new SchemaLoadError(
      `The schema file \`${path}\` is not valid YAML, at line ${line}, column ${col}: ${nameBareSymbols(error.message)}.`,
      path,
    );
  }
  return document.toJS();
}

/** Vault paths of the registry, for an error that a change of the registry can repair. */
function registryOf(mapping: ResourceMapping | null): string[] {
  return mapping?.registryPath === undefined ? [] : [mapping.registryPath];
}

/**
 * Vault path of the file that the registry maps to `uri`.
 *
 * @throws SchemaReferenceError When the mapped path is a web address or leaves the vault.
 */
function mappedPath(uri: string, file: string, referrer: string, mapping: ResourceMapping): string {
  const registry = registryOf(mapping);
  const fail = (reason: string): never => {
    throw new SchemaReferenceError(
      `The absolute URI \`${uri}\`, referenced from \`${referrer}\`, ${reason}.`,
      referrer,
      registry,
    );
  };
  if (isUri(file)) return fail(`is mapped by the registry \`${registry[0]}\` to a web address`);
  const path = resolveVaultPath("", file);
  if (path === null || path === "") {
    return fail(`is mapped by the registry \`${registry[0]}\` to a path outside the vault`);
  }
  return path;
}

/**
 * Checks that the file at `path`, mapped by the registry to `uri`, declares `uri` as its root
 * `$id`, so that the registry and the schema file agree on the identity of the resource.
 */
function checkDeclaredId(
  root: JsonValue,
  uri: string,
  path: string,
  mapping: ResourceMapping | null,
): void {
  const id = isJsonObject(root) ? root["$id"] : undefined;
  if (id === uri) return;
  const registry = registryOf(mapping);
  const written = typeof id === "string" ? `\`${id}\`` : "absent";
  throw new SchemaLoadError(
    `The registry \`${registry[0]}\` maps the absolute URI \`${uri}\` to \`${path}\`, whose \`$id\` is ${written}.`,
    path,
    registry,
  );
}

/** Error for the absolute URI `uri`, referenced from `referrer`, that nothing resolves. */
function unresolvedUri(
  uri: string,
  referrer: string,
  mapping: ResourceMapping | null,
): SchemaReferenceError {
  const reason =
    mapping === null || mapping.status === "available"
      ? `is mapped by no entry of the resources of the registry \`${mapping?.registryPath ?? ""}\``
      : `cannot be resolved, since ${mapping.reason}`;
  return new SchemaReferenceError(
    `The absolute URI \`${uri}\`, referenced from \`${referrer}\`, ${reason}, and no loaded schema declares it as its \`$id\`.`,
    referrer,
    registryOf(mapping),
  );
}
