/**
 * Model of the plugin settings, and their validation at the boundary where they are read from
 * the data file of the plugin.
 */
import type { PathRule } from "../domain";

export interface EkphrasisSettings {
  /** Path rules binding instances without a modeline, applied in this order. */
  readonly pathRules: readonly PathRule[];
}

export const DEFAULT_SETTINGS: EkphrasisSettings = { pathRules: [] };

/**
 * Settings read from `raw`, the stored data of the plugin. Every setting that is absent or
 * malformed takes its default, so a damaged data file never prevents the plugin from loading.
 */
export function parseSettings(raw: unknown): EkphrasisSettings {
  const record = isRecord(raw) ? raw : {};
  const rules = Array.isArray(record["pathRules"]) ? (record["pathRules"] as unknown[]) : [];
  return {
    pathRules: rules.flatMap((rule) =>
      isRecord(rule) && typeof rule["pattern"] === "string" && typeof rule["schema"] === "string"
        ? [{ pattern: rule["pattern"], schema: rule["schema"] }]
        : [],
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
