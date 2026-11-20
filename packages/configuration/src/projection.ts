/**
 * The projection of a configuration `ekphrasis:configuration@1` onto the settings keys of the
 * Ekphrasis plugin, which it stores in the data file of the plugin. The configuration writes its
 * paths relative to the root of the repository, and the plugin reads them relative to the vault;
 * the root is the vault or one of its folders. The module imports no schema, so that the tests of
 * the plugin import it alone.
 */

/** Error raised when a configuration cannot be projected. */
export class ConfigurationError extends Error {
  override readonly name = "ConfigurationError";
}

type Json = Record<string, unknown>;

/** Each key of the configuration and the settings key that it projects onto, in order. */
export const SETTINGS_KEYS: Readonly<Record<string, string>> = {
  schema_registry: "schemaRegistry",
  binding_key: "bindingKey",
  path_rules: "pathRules",
  excluded_paths: "excludedPaths",
  commit_delay: "commitDelay",
  custom_checker_timeout: "customCheckerTimeout",
  custom_checkers: "customCheckers",
  primary_view_command: "primaryViewCommand",
  post_creation_command: "postCreationCommand",
  graph_presentation_overrides: "graphPresentationOverrides",
};

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Return the rewriting of a path relative to the root into a path relative to the vault. The root
 * is the folder `root` of the vault, written with `/` and empty for the vault itself.
 */
export function vaultPath(root: string): (path: string) => string {
  const folder = (root === "." ? "" : root.replace(/^\.\//, "")).replace(/\/+$/, "");
  if (folder.startsWith("/") || folder.split("/").includes("..")) {
    throw new ConfigurationError(
      `the root must be the vault or one of its folders, not ${JSON.stringify(root)}`,
    );
  }
  return (path) => (folder === "" ? path : `${folder}/${path}`);
}

function overrides(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return (value as unknown[]).map((entry) => {
    if (!isObject(entry)) return entry;
    const { node_kinds: nodeKinds, edge_kinds: edgeKinds, ...rest } = entry;
    return {
      ...rest,
      ...(nodeKinds === undefined ? {} : { nodeKinds }),
      ...(edgeKinds === undefined ? {} : { edgeKinds }),
    };
  });
}

/**
 * Project a configuration onto the settings of the plugin. Each key present in the configuration
 * yields its settings key; a key absent stays absent, so that the plugin keeps its default. The
 * paths of the registry, of the path rules and of the excluded paths are rewritten from the root
 * of the repository into the vault.
 *
 * @param configuration A configuration that the schema of `ekphrasis:configuration@1` accepts.
 * @param root The folder of the root of the repository in the vault, empty for the vault itself.
 */
export function projectConfiguration(configuration: Json, root = ""): Json {
  const toVault = vaultPath(root);
  const settings: Json = {};
  for (const [key, setting] of Object.entries(SETTINGS_KEYS)) {
    if (!(key in configuration)) continue;
    const value = configuration[key];
    if (key === "schema_registry" && typeof value === "string") settings[setting] = toVault(value);
    else if (key === "excluded_paths" && Array.isArray(value))
      settings[setting] = (value as unknown[]).map((path) =>
        typeof path === "string" ? toVault(path) : path,
      );
    else if (key === "path_rules" && Array.isArray(value))
      settings[setting] = (value as unknown[]).map((rule) =>
        isObject(rule) && typeof rule["pattern"] === "string" && typeof rule["schema"] === "string"
          ? { pattern: toVault(rule["pattern"]), schema: toVault(rule["schema"]) }
          : rule,
      );
    else if (key === "graph_presentation_overrides") settings[setting] = overrides(value);
    else settings[setting] = value;
  }
  return settings;
}
