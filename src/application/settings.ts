/**
 * Model of the plugin settings, and their validation at the boundary where they are read from
 * the data file of the plugin.
 */
import type { JsonValue, PathRule } from "../domain";
import type { CustomCheckerRegistration } from "./protocols";

export interface EkphrasisSettings {
  /** Vault path of the registry mapping logical schema identifiers to schema files. */
  readonly schemaRegistry: string;
  /** Path rules binding instances without a schema field or modeline, applied in this order. */
  readonly pathRules: readonly PathRule[];
  /** Glob patterns of the files that bind to no schema, such as the skeletons of notes. */
  readonly excludedPaths: readonly string[];
  /** Pause of typing, in milliseconds, after which a text control commits its value. */
  readonly commitDelay: number;
  /** Absolute path of the Python interpreter that runs registered custom checkers. */
  readonly pythonInterpreter: string;
  /** Maximum duration of one checker call, in milliseconds. */
  readonly customCheckerTimeout: number;
  /** Python functions admitted under checker names, in display order. */
  readonly customCheckers: readonly CustomCheckerRegistration[];
  /** Arguments passed to the configured interpreter to generate one target-selected view. */
  readonly primaryViewCommand: readonly string[];
  /** Arguments passed after an instance is created, so its producer can update related files. */
  readonly postCreationCommand: readonly string[];
  /** Vault-local visual overrides, keyed by a producer graph-presentation profile. */
  readonly graphPresentationOverrides: readonly GraphPresentationOverride[];
}

export interface GraphCategoryOverride {
  readonly title?: string;
  readonly shape?: string;
  readonly marker?: string;
  readonly style?: string;
}

export interface GraphNodeKindOverride {
  /** Category of a locally registered kind; a producer-owned category cannot be replaced. */
  readonly category?: string;
  readonly title?: string;
  readonly icon?: string;
  readonly marker?: string;
  readonly style?: string;
}

export interface GraphEdgeKindOverride {
  readonly title?: string;
  /** Layer of a locally registered kind; a producer-owned layer cannot be replaced. */
  readonly layer?: string;
  readonly style?: string;
  /** Renderer-owned arrowhead recipe. */
  readonly arrow?: "arrow" | "diamond" | "circle" | "none";
  /** Whether the visible edge caption is retained. */
  readonly caption?: "show" | "hide";
}

export interface GraphPresentationOverride {
  readonly profile: string;
  /** Producer profile version to which this override applies. */
  readonly version: number;
  readonly layouts?: {
    readonly recommended?: string;
    readonly compatible?: readonly string[];
  };
  readonly categories: Readonly<Record<string, GraphCategoryOverride>>;
  readonly nodeKinds: Readonly<Record<string, GraphNodeKindOverride>>;
  readonly edgeKinds: Readonly<Record<string, GraphEdgeKindOverride>>;
}

/**
 * Admitted commit delays, in milliseconds. A shorter pause would commit a word before it is
 * finished; a longer one would leave the file behind the form for long periods.
 */
export const COMMIT_DELAY_LIMITS = { min: 250, max: 10_000, step: 250 } as const;

/** Admitted duration of one Python checker call, in milliseconds. */
export const CUSTOM_CHECKER_TIMEOUT_LIMITS = {
  min: 100,
  max: 120_000,
  step: 100,
} as const;

export const DEFAULT_SETTINGS: EkphrasisSettings = {
  schemaRegistry: "",
  pathRules: [],
  excludedPaths: [],
  commitDelay: 1000,
  pythonInterpreter: "",
  customCheckerTimeout: 10_000,
  customCheckers: [],
  primaryViewCommand: [],
  postCreationCommand: [],
  graphPresentationOverrides: [],
};

/**
 * Settings read from `raw`, the stored data of the plugin. Every setting that is absent or
 * malformed takes its default, so a damaged data file never prevents the plugin from loading.
 */
export function parseSettings(raw: unknown): EkphrasisSettings {
  const record = isRecord(raw) ? raw : {};
  const rules = Array.isArray(record["pathRules"]) ? (record["pathRules"] as unknown[]) : [];
  const checkers = Array.isArray(record["customCheckers"])
    ? (record["customCheckers"] as unknown[])
    : [];
  const delay = record["commitDelay"];
  const checkerTimeout = record["customCheckerTimeout"];
  return {
    schemaRegistry:
      typeof record["schemaRegistry"] === "string"
        ? record["schemaRegistry"]
        : DEFAULT_SETTINGS.schemaRegistry,
    pathRules: rules.flatMap((rule) =>
      isRecord(rule) && typeof rule["pattern"] === "string" && typeof rule["schema"] === "string"
        ? [{ pattern: rule["pattern"], schema: rule["schema"] }]
        : [],
    ),
    excludedPaths: stringList(record["excludedPaths"]),
    commitDelay:
      typeof delay === "number" &&
      delay >= COMMIT_DELAY_LIMITS.min &&
      delay <= COMMIT_DELAY_LIMITS.max
        ? delay
        : DEFAULT_SETTINGS.commitDelay,
    pythonInterpreter:
      typeof record["pythonInterpreter"] === "string"
        ? record["pythonInterpreter"]
        : DEFAULT_SETTINGS.pythonInterpreter,
    customCheckerTimeout:
      typeof checkerTimeout === "number" &&
      checkerTimeout >= CUSTOM_CHECKER_TIMEOUT_LIMITS.min &&
      checkerTimeout <= CUSTOM_CHECKER_TIMEOUT_LIMITS.max
        ? checkerTimeout
        : DEFAULT_SETTINGS.customCheckerTimeout,
    customCheckers: checkers.flatMap((checker) =>
      isRecord(checker) &&
      typeof checker["name"] === "string" &&
      typeof checker["module"] === "string" &&
      typeof checker["function"] === "string"
        ? [
            {
              name: checker["name"],
              module: checker["module"],
              function: checker["function"],
              ...instanceScopeOf(checker),
            },
          ]
        : [],
    ),
    primaryViewCommand: stringList(record["primaryViewCommand"]),
    postCreationCommand: stringList(record["postCreationCommand"]),
    graphPresentationOverrides: parseGraphPresentationOverrides(
      record["graphPresentationOverrides"],
    ),
  };
}

const PRESENTATION_TOKEN = /^[a-z][a-z0-9-]*$/u;
const GRAPH_ARROW_RECIPES = ["arrow", "diamond", "circle", "none"] as const;
const GRAPH_CAPTION_RECIPES = ["show", "hide"] as const;

/** Keep the safe, partial presentation overrides from stored plugin data. */
export function parseGraphPresentationOverrides(
  raw: unknown,
): readonly GraphPresentationOverride[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw.flatMap((value) => {
    if (!isRecord(value)) return [];
    const profile = tokenValue(value["profile"]);
    const version = positiveInteger(value["version"]);
    if (profile === undefined || version === undefined || seen.has(profile)) return [];
    seen.add(profile);
    return [
      {
        profile,
        version,
        ...layoutOverride(value["layouts"]),
        categories: overrideEntries(value["categories"], categoryOverride),
        nodeKinds: overrideEntries(value["nodeKinds"], nodeKindOverride),
        edgeKinds: overrideEntries(value["edgeKinds"], edgeKindOverride),
      },
    ];
  });
}

/** Identify stored graph-presentation units that the safe parser would discard. */
export function graphPresentationOverrideIssues(raw: unknown): readonly string[] {
  if (!Array.isArray(raw)) return ["The value must be a JSON list."];
  const issues: string[] = [];
  const profiles = new Set<string>();
  raw.forEach((value, index) => {
    const path = `Entry ${index + 1}`;
    if (!isRecord(value)) {
      issues.push(`${path} must be an object.`);
      return;
    }
    reportUnknownKeys(
      value,
      ["profile", "version", "layouts", "categories", "nodeKinds", "edgeKinds"],
      path,
      issues,
    );
    const profile = tokenValue(value["profile"]);
    if (profile === undefined) issues.push(`${path}.profile must be a safe identifier.`);
    else if (profiles.has(profile)) issues.push(`${path}.profile duplicates ${profile}.`);
    else profiles.add(profile);
    if (positiveInteger(value["version"]) === undefined) {
      issues.push(`${path}.version must be a positive integer.`);
    }
    inspectLayouts(value["layouts"], `${path}.layouts`, issues);
    inspectOverrideMap(
      value["categories"],
      `${path}.categories`,
      ["title", "shape", "marker", "style"],
      ["shape", "style"],
      issues,
    );
    inspectOverrideMap(
      value["nodeKinds"],
      `${path}.nodeKinds`,
      ["category", "title", "icon", "marker", "style"],
      ["category", "icon", "style"],
      issues,
    );
    inspectOverrideMap(
      value["edgeKinds"],
      `${path}.edgeKinds`,
      ["title", "layer", "style", "arrow", "caption"],
      ["layer", "style", "arrow", "caption"],
      issues,
    );
    inspectEnumeratedOverride(
      value["edgeKinds"],
      `${path}.edgeKinds`,
      "arrow",
      GRAPH_ARROW_RECIPES,
      issues,
    );
    inspectEnumeratedOverride(
      value["edgeKinds"],
      `${path}.edgeKinds`,
      "caption",
      GRAPH_CAPTION_RECIPES,
      issues,
    );
  });
  return issues;
}

function inspectLayouts(raw: unknown, path: string, issues: string[]): void {
  if (raw === undefined) return;
  if (!isRecord(raw)) {
    issues.push(`${path} must be an object.`);
    return;
  }
  reportUnknownKeys(raw, ["recommended", "compatible"], path, issues);
  if (raw["recommended"] !== undefined && tokenValue(raw["recommended"]) === undefined) {
    issues.push(`${path}.recommended must be a safe identifier.`);
  }
  if (raw["compatible"] !== undefined && tokenList(raw["compatible"]) === undefined) {
    issues.push(`${path}.compatible must be a list of safe identifiers.`);
  } else if (Array.isArray(raw["compatible"])) {
    raw["compatible"].forEach((value, index) => {
      if (tokenValue(value) === undefined) {
        issues.push(`${path}.compatible[${index}] must be a safe identifier.`);
      }
    });
  }
}

function inspectOverrideMap(
  raw: unknown,
  path: string,
  keys: readonly string[],
  tokenKeys: readonly string[],
  issues: string[],
): void {
  if (raw === undefined) return;
  if (!isRecord(raw)) {
    issues.push(`${path} must be an object.`);
    return;
  }
  for (const [identifier, value] of Object.entries(raw)) {
    const entryPath = `${path}.${identifier}`;
    if (!PRESENTATION_TOKEN.test(identifier)) {
      issues.push(`${entryPath} uses an unsafe identifier.`);
      continue;
    }
    if (!isRecord(value)) {
      issues.push(`${entryPath} must be an object.`);
      continue;
    }
    reportUnknownKeys(value, keys, entryPath, issues);
    for (const key of keys) {
      const property = value[key];
      if (property === undefined) continue;
      const valid = tokenKeys.includes(key)
        ? tokenValue(property) !== undefined
        : typeof property === "string" && property.trim() !== "";
      if (!valid) issues.push(`${entryPath}.${key} has an invalid value.`);
    }
  }
}

function inspectEnumeratedOverride(
  raw: unknown,
  path: string,
  key: string,
  admitted: readonly string[],
  issues: string[],
): void {
  if (!isRecord(raw)) return;
  for (const [identifier, value] of Object.entries(raw)) {
    if (!PRESENTATION_TOKEN.test(identifier) || !isRecord(value)) continue;
    const property = value[key];
    const token = tokenValue(property);
    if (token !== undefined && !admitted.includes(token)) {
      issues.push(`${path}.${identifier}.${key} is not a registered recipe.`);
    }
  }
}

function reportUnknownKeys(
  record: Record<string, unknown>,
  admitted: readonly string[],
  path: string,
  issues: string[],
): void {
  for (const key of Object.keys(record)) {
    if (!admitted.includes(key)) issues.push(`${path}.${key} is not recognized.`);
  }
}

function layoutOverride(raw: unknown): Pick<GraphPresentationOverride, "layouts"> {
  if (!isRecord(raw)) return {};
  const recommended = tokenValue(raw["recommended"]);
  const compatible = tokenList(raw["compatible"]);
  return recommended === undefined && compatible === undefined
    ? {}
    : {
        layouts: {
          ...(recommended === undefined ? {} : { recommended }),
          ...(compatible === undefined ? {} : { compatible }),
        },
      };
}

function categoryOverride(raw: Record<string, unknown>): GraphCategoryOverride {
  return {
    ...textProperty(raw, "title"),
    ...tokenProperty(raw, "shape"),
    ...textProperty(raw, "marker"),
    ...tokenProperty(raw, "style"),
  };
}

function nodeKindOverride(raw: Record<string, unknown>): GraphNodeKindOverride {
  return {
    ...tokenProperty(raw, "category"),
    ...textProperty(raw, "title"),
    ...tokenProperty(raw, "icon"),
    ...textProperty(raw, "marker"),
    ...tokenProperty(raw, "style"),
  };
}

function edgeKindOverride(raw: Record<string, unknown>): GraphEdgeKindOverride {
  return {
    ...textProperty(raw, "title"),
    ...tokenProperty(raw, "layer"),
    ...tokenProperty(raw, "style"),
    ...enumeratedTokenProperty(raw, "arrow", GRAPH_ARROW_RECIPES),
    ...enumeratedTokenProperty(raw, "caption", GRAPH_CAPTION_RECIPES),
  };
}

function overrideEntries<Entry>(
  raw: unknown,
  parse: (entry: Record<string, unknown>) => Entry,
): Readonly<Record<string, Entry>> {
  if (!isRecord(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).flatMap(([identifier, entry]) =>
      PRESENTATION_TOKEN.test(identifier) && isRecord(entry)
        ? [[identifier, parse(entry)] as const]
        : [],
    ),
  );
}

function textProperty<Key extends string>(
  record: Record<string, unknown>,
  key: Key,
): Partial<Record<Key, string>> {
  const value = record[key];
  return typeof value === "string" && value.trim() !== ""
    ? ({ [key]: value.trim() } as Record<Key, string>)
    : {};
}

function tokenProperty<Key extends string>(
  record: Record<string, unknown>,
  key: Key,
): Partial<Record<Key, string>> {
  const value = tokenValue(record[key]);
  return value === undefined ? {} : ({ [key]: value } as Record<Key, string>);
}

function enumeratedTokenProperty<Key extends string, Value extends string>(
  record: Record<string, unknown>,
  key: Key,
  admitted: readonly Value[],
): Partial<Record<Key, Value>> {
  const value = tokenValue(record[key]);
  return value !== undefined && admitted.includes(value as Value)
    ? ({ [key]: value } as Record<Key, Value>)
    : {};
}

function tokenValue(raw: unknown): string | undefined {
  return typeof raw === "string" && PRESENTATION_TOKEN.test(raw) ? raw : undefined;
}

function positiveInteger(raw: unknown): number | undefined {
  return typeof raw === "number" && Number.isInteger(raw) && raw > 0 ? raw : undefined;
}

function tokenList(raw: unknown): readonly string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return [
    ...new Set(
      raw.flatMap((value) => {
        const token = tokenValue(value);
        return token === undefined ? [] : [token];
      }),
    ),
  ];
}

/** A stored list whose members are all strings, or the empty compatibility default. */
function stringList(raw: unknown): readonly string[] {
  return Array.isArray(raw) && raw.every((item) => typeof item === "string") ? raw : [];
}

/**
 * Schema patterns and arguments of a stored registration, each kept only when well formed. The
 * data file is JSON, so a stored mapping of arguments holds JSON values only.
 */
function instanceScopeOf(
  checker: Record<string, unknown>,
): Pick<CustomCheckerRegistration, "schemas" | "arguments"> {
  const schemas = checker["schemas"];
  const args = checker["arguments"];
  return {
    ...(Array.isArray(schemas) && schemas.every((item) => typeof item === "string")
      ? { schemas: schemas.filter((item) => item.trim() !== "") }
      : {}),
    ...(isRecord(args) ? { arguments: args as Readonly<Record<string, JsonValue>> } : {}),
  };
}

/** Registrations with every value needed to import and invoke their Python callable. */
export function completeCustomCheckers(
  checkers: readonly CustomCheckerRegistration[],
): readonly CustomCheckerRegistration[] {
  return checkers.filter(
    (checker) =>
      checker.name.trim() !== "" && checker.module.trim() !== "" && checker.function.trim() !== "",
  );
}

/** Resolve vault-relative Python files while leaving importable module names unchanged. */
export function resolveCustomCheckerModules(
  checkers: readonly CustomCheckerRegistration[],
  resolveVaultPath: (path: string) => string,
): readonly CustomCheckerRegistration[] {
  return checkers.map((checker) => ({
    ...checker,
    module: checker.module.endsWith(".py") ? resolveVaultPath(checker.module) : checker.module,
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
