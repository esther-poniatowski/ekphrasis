/**
 * Implementation of the `SchemaLoader` port: reads a schema file and every schema file that its
 * references reach, through the `FileSource` port, and parses each one as JSON or YAML.
 */
import { LineCounter, parseDocument } from "yaml";
import type { FileSource, SchemaLoader } from "../../application";
import {
  asJsonValue,
  collectReferences,
  extensionOf,
  isUri,
  parseReference,
  SchemaSet,
  type JsonValue,
  type SchemaDocument,
} from "../../domain";
import { SchemaLoadError } from "../../errors";
import { nameBareSymbols } from "../library-messages";

export class FileSchemaLoader implements SchemaLoader {
  constructor(private readonly files: FileSource) {}

  /**
   * Loads the schema at `path` with the documents that its references reach, in breadth-first
   * order of discovery.
   *
   * @throws SchemaLoadError When a file is missing, fails to parse, or holds no JSON value.
   * @throws SchemaReferenceError When a `$ref` designates no schema of the loaded documents.
   */
  async load(path: string): Promise<SchemaSet> {
    const documents: SchemaDocument[] = [];
    const queued = new Set([path]);
    const queue: { path: string; referrer: string | null }[] = [{ path, referrer: null }];
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      const root = await this.read(next.path, next.referrer);
      documents.push({ path: next.path, root });
      for (const reference of collectReferences(root)) {
        const target = parseReference(reference, next.path)?.document ?? null;
        if (target === null || isUri(target) || queued.has(target)) continue;
        queued.add(target);
        queue.push({ path: target, referrer: next.path });
      }
    }
    return new SchemaSet(path, documents);
  }

  private async read(path: string, referrer: string | null): Promise<JsonValue> {
    const text = await this.files.read(path);
    if (text === null) {
      const origin = referrer === null ? "" : `, referenced from \`${referrer}\`,`;
      throw new SchemaLoadError(`The schema file \`${path}\`${origin} does not exist.`, path);
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
