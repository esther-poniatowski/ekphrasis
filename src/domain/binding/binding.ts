/**
 * Resolution of the schema of an instance. A root `_schema` contract resolves through the
 * registry. Otherwise, a modeline or the first matching path rule names the schema file.
 */
import { folderOf, isUri, resolveVaultPath } from "../files/vault-paths";
import { GlobPattern } from "./glob";
import { readModeline } from "./modeline";
import { parseSchemaIdentifier, readSchemaDeclaration } from "./schema-field";

/** Rule of the settings assigning a schema to every file whose path matches a glob pattern. */
export interface PathRule {
  /** Glob pattern matched against the vault path of an instance. */
  readonly pattern: string;
  /** Vault path of the schema, from the vault root. */
  readonly schema: string;
}

/** Source from which the schema binding of a record was resolved. */
export type BindingSource = "schema-field" | "modeline" | "path-rule";

/** Schema of a record, with the source from which the binding was resolved. */
export interface SchemaBinding {
  readonly source: BindingSource;
  /** Logical contract identifier or schema path written in the source. */
  readonly reference: string;
  /** Vault path of the schema file. */
  readonly schemaPath: string;
  /** Vault path of the registry used by a schema field, absent for compatibility bindings. */
  readonly registryPath?: string;
}

/** Outcome of resolution: a schema binding, no applicable source, or an invalid source value. */
export type BindingResult =
  | { readonly status: "bound"; readonly binding: SchemaBinding }
  | {
      readonly status: "unbound";
      readonly registryPath?: string;
      /** Excluded path pattern matching the file, which then binds to no schema. */
      readonly excludedBy?: string;
    }
  | {
      readonly status: "invalid";
      readonly source: BindingSource;
      readonly reference: string;
      readonly reason: string;
      /** Vault path whose change can make this binding valid. */
      readonly registryPath?: string;
    };

/** Resolves the schema of the instance at `path`, holding `text`, under the path `rules`. */
export function resolveBinding(
  path: string,
  text: string,
  rules: readonly PathRule[],
  registry: ReadonlyMap<string, string> | null = null,
  registryPath?: string,
): BindingResult {
  const declaration = readSchemaDeclaration(text);
  if (declaration.status === "declared") {
    const identifier = declaration.value;
    if (identifier === null) {
      return {
        status: "invalid",
        source: "schema-field",
        reference: declaration.raw,
        reason: "the schema identifier must have the form <owner>:<type>@<major>",
        ...(registryPath === undefined ? {} : { registryPath }),
      };
    }
    const declared = parseSchemaIdentifier(identifier);
    if (declared === null) {
      return {
        status: "invalid",
        source: "schema-field",
        reference: identifier,
        reason: "the schema identifier must have the form <owner>:<type>@<major>",
        ...(registryPath === undefined ? {} : { registryPath }),
      };
    }
    if (registry === null) {
      return { status: "unbound" };
    }
    const registered = registry.get(identifier);
    if (registered === undefined) {
      if (!registersFormat(registry, declared)) {
        return {
          status: "unbound",
          ...(registryPath === undefined ? {} : { registryPath }),
        };
      }
      return {
        status: "invalid",
        source: "schema-field",
        reference: identifier,
        reason: `the schema identifier is absent from the registry, which holds another major of \`${declared.owner}:${declared.type}\``,
        ...(registryPath === undefined ? {} : { registryPath }),
      };
    }
    const result = bindTo("schema-field", identifier, "", registered);
    if (registryPath === undefined) return result;
    return result.status === "bound"
      ? { status: "bound", binding: { ...result.binding, registryPath } }
      : result.status === "invalid"
        ? { ...result, registryPath }
        : result;
  }
  const modeline = readModeline(text);
  if (modeline !== null) return bindTo("modeline", modeline, folderOf(path));
  const rule = rules.find(
    (candidate) => isComplete(candidate) && new GlobPattern(candidate.pattern).matches(path),
  );
  return rule === undefined ? { status: "unbound" } : bindTo("path-rule", rule.schema, "");
}

/**
 * First of the excluded path `patterns` that matches `path`, or `null` when none does.
 *
 * An excluded file binds to no schema, whatever its `_schema` field, modeline or path rules
 * state, so a note skeleton whose placeholders fail its schema opens in the source view. A
 * blank pattern, such as a line being filled in, excludes no file.
 */
export function exclusionOf(path: string, patterns: readonly string[]): string | null {
  return (
    patterns.find(
      (pattern) => pattern.trim() !== "" && new GlobPattern(pattern).matches(path),
    ) ?? null
  );
}

/**
 * Whether the registry holds a major of the format `<owner>:<type>` that `declared` names.
 *
 * Only a registered format can make an absent identifier an error: a stale or future major of
 * that format. A tool may register some of its formats only, so another format of the same owner
 * stays unbound, and the tool that reads the file reports a wrong identifier itself.
 */
function registersFormat(
  registry: ReadonlyMap<string, string>,
  declared: { readonly owner: string; readonly type: string },
): boolean {
  return [...registry.keys()].some((candidate) => {
    const parsed = parseSchemaIdentifier(candidate);
    return parsed !== null && parsed.owner === declared.owner && parsed.type === declared.type;
  });
}

/** Whether a rule names both its pattern and its schema; a rule being filled in binds nothing. */
function isComplete(rule: PathRule): boolean {
  return rule.pattern.trim() !== "" && rule.schema.trim() !== "";
}

function bindTo(
  source: BindingSource,
  reference: string,
  base: string,
  target: string = reference,
): BindingResult {
  if (isUri(target)) {
    return { status: "invalid", source, reference, reason: "remote schemas are not supported" };
  }
  const schemaPath = resolveVaultPath(base, target);
  if (schemaPath === null || schemaPath === "") {
    return { status: "invalid", source, reference, reason: "the path leaves the vault" };
  }
  return { status: "bound", binding: { source, reference, schemaPath } };
}
