/**
 * The configuration of Ekphrasis in TypeScript: the check of a configuration
 * `ekphrasis:configuration@1` against its schema, and its projection onto the settings of the
 * plugin. The specification is `docs/features/configuration.md` of the repository of Ekphrasis.
 */
export {
  ConfigurationError,
  SETTINGS_KEYS,
  projectConfiguration,
  vaultPath,
} from "./projection.js";
export {
  CONFIGURATION_FORMAT,
  CONFIGURATION_SCHEMA_ID,
  type ConfigurationIssue,
  configurationIssues,
} from "./validation.js";
