# @ekphrasis/configuration

The package `@ekphrasis/configuration` implements the configuration of Ekphrasis in TypeScript, for
a tool that writes the settings of the plugin from a repository. It checks a file `ekphrasis.yml`
of format `ekphrasis:configuration@1` against its schema, and projects it onto the settings keys of
the plugin. The specification is the [configuration](../../docs/features/configuration.md) page,
and the [cases](../../specs/cases/configuration.yml) fix the verdicts.

| Name | Returns |
| --- | --- |
| `configurationIssues(document)` | each `ConfigurationIssue` of a document: the JSON Pointer of the node and the rule broken; empty when the document conforms |
| `projectConfiguration(document, root)` | the settings of the plugin, the paths rewritten from the root of the repository into the vault, `root` being the folder of the root in the vault |
| `SETTINGS_KEYS` | each key of the configuration and the setting that it projects onto |
| `CONFIGURATION_FORMAT`, `CONFIGURATION_SCHEMA_ID` | the contract identifier and the absolute `$id` of the schema |
