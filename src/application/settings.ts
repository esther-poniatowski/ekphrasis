/**
 * Model of the plugin settings, and their validation at the boundary where they are read from
 * the data file of the plugin.
 */
import type { PathRule } from "../domain";

export interface EkphrasisSettings {
  /** Vault path of the registry mapping logical schema identifiers to schema files. */
  readonly schemaRegistry: string;
  /** Path rules binding instances without a schema field or modeline, applied in this order. */
  readonly pathRules: readonly PathRule[];
  /** Pause of typing, in milliseconds, after which a text control commits its value. */
  readonly commitDelay: number;
}

/**
 * Admitted commit delays, in milliseconds. A shorter pause would commit a word before it is
 * finished; a longer one would leave the file behind the form for long periods.
 */
export const COMMIT_DELAY_LIMITS = { min: 250, max: 10_000, step: 250 } as const;

export const DEFAULT_SETTINGS: EkphrasisSettings = {
  schemaRegistry: "",
  pathRules: [],
  commitDelay: 1000,
};

/**
 * Settings read from `raw`, the stored data of the plugin. Every setting that is absent or
 * malformed takes its default, so a damaged data file never prevents the plugin from loading.
 */
export function parseSettings(raw: unknown): EkphrasisSettings {
  const record = isRecord(raw) ? raw : {};
  const rules = Array.isArray(record["pathRules"]) ? (record["pathRules"] as unknown[]) : [];
  const delay = record["commitDelay"];
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
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
