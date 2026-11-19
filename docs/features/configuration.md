---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Configuration
---
# Configuration

A repository configures Ekphrasis in one file, `ekphrasis.yml`, of format `ekphrasis:configuration@1`. The settings of the plugin, which the plugin stores in its data file, are projected from that file. Ekphrasis owns both the format and the projection, so that a tool installing the plugin projects the file without knowing the settings keys.

## Format

The format is published as the JSON Schema [configuration.schema.json](../../specs/schemas/configuration.schema.json), under the absolute `$id` `https://github.com/esther-poniatowski/ekphrasis/specs/schemas/configuration.schema.json`, and exported by the registry of Ekphrasis. The key `_schema`, first in the file, holds `ekphrasis:configuration@1`. Every path of the file is relative to the root of the repository, with segments separated by `/`.

| Key | Setting | Holds |
| --- | --- | --- |
| `schema_registry` | `schemaRegistry` | the schema registry mapping each contract to its schema file |
| `path_rules` | `pathRules` | the rules binding the records that name no contract, each a glob `pattern` and a `schema` file |
| `excluded_paths` | `excludedPaths` | the globs of the files that bind to no schema |
| `commit_delay` | `commitDelay` | the pause of typing after which a text control commits its value, from 250 to 10000 milliseconds |
| `custom_checker_timeout` | `customCheckerTimeout` | the longest call of a custom checker, from 100 to 120000 milliseconds |
| `custom_checkers` | `customCheckers` | the [custom checkers](custom-checkers.md), each with its `name`, `module` and `function`, and its optional `schemas` and `arguments` |
| `primary_view_command` | `primaryViewCommand` | the arguments that generate one view selected by a target |
| `post_creation_command` | `postCreationCommand` | the arguments run after a record is created |
| `graph_presentation_overrides` | `graphPresentationOverrides` | the overrides of the presentation of graphs, each for one `profile` and `version`, with its `layouts`, `categories`, `node_kinds` and `edge_kinds` |

Two kinds of setting stay outside the file: the settings of one machine, such as the Python interpreter of the custom checkers, and the state of the interface.

## Projection

The projection writes each key present in the file under its setting, and leaves a missing key out, so that the plugin keeps its default. Within the overrides of graphs, `node_kinds` and `edge_kinds` become `nodeKinds` and `edgeKinds`.

The plugin reads its paths relative to the vault, while the file writes them relative to the root of the repository. The root is the vault or one of its folders; the projection prefixes each path of `schema_registry`, `path_rules` and `excluded_paths` with the folder of the root in the vault. A root outside the vault has no projection.

## Implementation

The TypeScript package `@ekphrasis/configuration`, in `packages/configuration`, checks a file against the schema and projects it. The cases of [configuration.yml](../../specs/cases/configuration.yml) fix the verdict of the schema on each document and its projection, and the tests of the plugin read every projected setting back through the settings parser of the plugin.
