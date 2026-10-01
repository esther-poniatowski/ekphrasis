---
tags:
  - assessment
index: "[References - Existing plugins](docs/references/_index.md)"
aliases:
  - Plugins for YAML processing
---
# Assessment of existing plugins - YAML processing

Four Obsidian plugins that process YAML content are assessed below, and none of them fills a YAML file through a form generated from a schema. Two of them act on the frontmatter of notes only, and two of them open standalone YAML files, as ekphrasis does. To establish these facts, each plugin is measured against the [requirements](../requirements.md) of ekphrasis, first in a section of its own, then in a coverage table.

## Nested Properties

[Nested Properties](https://community.obsidian.md/plugins/nested-properties) displays the nested objects and arrays of the frontmatter as a collapsible tree in the Properties panel. Each nested key can be edited, retyped, or renamed across the vault. The plugin acts on the frontmatter of a note only, so a standalone YAML file falls outside its scope. Each leaf value is edited in an input field, where a formula or a link appears as source text. An edit made in the Properties panel reaches the file through the frontmatter writer of Obsidian. This writer reapplies its own indentation ([report on nested frontmatter](https://github.com/SebastianMC/obsidian-custom-sort/discussions/95)). Therefore, the frontmatter writer conflicts with the [requirement on source preservation](../requirements.md#^source-preservation).

## YAML Editor

[YAML Editor](https://community.obsidian.md/plugins/yaml-editor) provides an editor dedicated to YAML, with completions and folding. According to the documentation of the plugin, YAML Editor handles three regions:

- the frontmatter;
- fenced code blocks tagged as YAML;
- standalone files with the extension `.yaml` or `.yml`, listed in the file explorer and opened in its own editor.

Completions draw on JSON Schema files stored in a configurable directory, and on a schema inferred from the YAML of the vault. Each completion of a key is annotated with the type of the key, its required status and its description. However, the diagnostics report parse errors only, so the schema never validates the values. YAML Editor edits the YAML text, without a form and without rendering string values.

## YAML Databases

[YAML Databases](https://github.com/ondreu/YAML-Databases) opens YAML files as a spreadsheet, as a form, or as raw source. The files opened carry the suffix `.yaml.md`, or the plain extension `.yaml` or `.yml`. The documented views target tabular records. None of them is documented as validating values against a schema, or as rendering values as Markdown.

## YAML Properties

[YAML Properties](https://community.obsidian.md/plugins/yaml-properties) replaces the Properties editor of a note with an editable YAML block in Live Preview. In Reading view, the plugin displays a highlighted block that cannot be edited. YAML Properties leaves the YAML unchanged unless the author edits it. The plugin acts on the frontmatter only, and highlights the YAML syntax without rendering string values.

## Coverage

The four plugins cover each requirement to the following extent:

| Requirement | Nested Properties | YAML Editor | YAML Databases | YAML Properties |
| --- | --- | --- | --- | --- |
| [Typed controls](../requirements.md#^typed-controls) | partial: input fields for frontmatter values | not met: text editor | partial: form for tabular records | not met: text block |
| [Instructions on demand](../requirements.md#^instructions-on-demand) | not met | partial: descriptions in completions | not documented | not met |
| [Rendered content](../requirements.md#^rendered-content) | not met | not met | not documented | not met |
| [Visible structure](../requirements.md#^visible-structure) | partial: collapsible tree of the frontmatter | partial: folding of source text | partial: records as spreadsheet or form | not met |
| [Outline](../requirements.md#^outline) | not met | not documented | not documented | not met |
| [Declared rules](../requirements.md#^declared-rules) | not met | not met: parse errors only | not documented | not met |
| [Custom checkers](../requirements.md#^custom-checkers) | not met | not met | not met | not met |
| [Visible issues](../requirements.md#^visible-issues) | not met | partial: parse errors in the editor | not documented | not met |
| [Progressive saving](../requirements.md#^progressive-saving) | met for the frontmatter | met: text editor | not documented | met for the frontmatter |
| [Source preservation](../requirements.md#^source-preservation) | not met: frontmatter rewritten | met: text edits only | not documented | met |
| [Source access](../requirements.md#^source-access) | met: note source | met | met: raw source view | met for the frontmatter |

## Consequences for ekphrasis

Three consequences for the design follow from the coverage:

- None of the four plugins validates a YAML file against a schema, and none fills one through a form generated from a schema. These two gaps form the scope of ekphrasis.
- YAML Editor and YAML Databases open the standalone YAML files that ekphrasis opens, so a vault can enable at most one of the three plugins, as the [conflict on extensions](../adr/plain-yaml-instances.md#^extension-conflict) records.
- Nested Properties and YAML Properties remain compatible with ekphrasis, since both act on the frontmatter of notes only.
