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
  commitDelay: 1000,
  pythonInterpreter: "",
  customCheckerTimeout: 10_000,
  customCheckers: [],
  primaryViewCommand: [],
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
  };
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
