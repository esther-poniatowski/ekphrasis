/**
 * Resolution of the schema of an instance, from the first of two sources that names one: the
 * modeline of the file, and else the first path rule of the settings that matches its path.
 */
import { folderOf, isUri, resolveVaultPath } from "../files/vault-paths";
import { GlobPattern } from "./glob";
import { readModeline } from "./modeline";

/** Rule of the settings assigning a schema to every file whose path matches a glob pattern. */
export interface PathRule {
  /** Glob pattern matched against the vault path of an instance. */
  readonly pattern: string;
  /** Vault path of the schema, from the vault root. */
  readonly schema: string;
}

/** Source that named the schema of an instance. */
export type BindingSource = "modeline" | "path-rule";

/** Schema of an instance, with the source that named it. */
export interface SchemaBinding {
  readonly source: BindingSource;
  /** Reference as written in the source (modeline or rule). */
  readonly reference: string;
  /** Vault path of the schema file. */
  readonly schemaPath: string;
}

/** Outcome of the resolution: a schema, no source naming one, or a source naming no vault file. */
export type BindingResult =
  | { readonly status: "bound"; readonly binding: SchemaBinding }
  | { readonly status: "unbound" }
  | {
      readonly status: "invalid";
      readonly source: BindingSource;
      readonly reference: string;
      readonly reason: string;
    };

/** Resolves the schema of the instance at `path`, holding `text`, under the path `rules`. */
export function resolveBinding(
  path: string,
  text: string,
  rules: readonly PathRule[],
): BindingResult {
  const modeline = readModeline(text);
  if (modeline !== null) return bindTo("modeline", modeline, folderOf(path));
  const rule = rules.find(
    (candidate) => isComplete(candidate) && new GlobPattern(candidate.pattern).matches(path),
  );
  return rule === undefined ? { status: "unbound" } : bindTo("path-rule", rule.schema, "");
}

/** Whether a rule names both its pattern and its schema; a rule being filled in binds nothing. */
function isComplete(rule: PathRule): boolean {
  return rule.pattern.trim() !== "" && rule.schema.trim() !== "";
}

function bindTo(source: BindingSource, reference: string, base: string): BindingResult {
  if (isUri(reference)) {
    return { status: "invalid", source, reference, reason: "remote schemas are not supported" };
  }
  const schemaPath = resolveVaultPath(base, reference);
  if (schemaPath === null || schemaPath === "") {
    return { status: "invalid", source, reference, reason: "the path leaves the vault" };
  }
  return { status: "bound", binding: { source, reference, schemaPath } };
}
