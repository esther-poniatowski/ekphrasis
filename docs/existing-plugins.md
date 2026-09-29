---
tags:
  - assessment
index: "[ekphrasis documentation](docs/_index.md)"
aliases:
  - Assessment of existing plugins
---
# Assessment of existing plugins

Four Obsidian plugins process YAML content, but none of them renders string values as Markdown. None of them addresses an individual key, and none is documented as keeping presentation apart from data. To establish these gaps, each plugin is measured against the [requirements](requirements.md) of ekphrasis, first in a section of its own, then in a coverage table.

## Nested Properties

[Nested Properties](https://community.obsidian.md/plugins/nested-properties) displays the nested objects and arrays of the frontmatter as a collapsible tree in the Properties panel. Each nested key can be edited, retyped, or renamed across the vault. The plugin acts on the frontmatter of a note only, so the body of a YAML note falls outside its scope. Each leaf value is edited in an input field, where a formula or a link appears as source text. An edit made in the Properties panel reaches the file through the frontmatter writer of Obsidian. This writer reapplies its own indentation ([report on nested frontmatter](https://github.com/SebastianMC/obsidian-custom-sort/discussions/95)). Therefore, the frontmatter writer conflicts with the [single-source requirement](requirements.md#^single-source).

## YAML Editor

[YAML Editor](https://community.obsidian.md/plugins/yaml-editor) provides an editing mode dedicated to YAML, with assistance functions such as completions, folding and diagnostics. According to the documentation of the plugin, YAML Editor handles three regions:

- the frontmatter;
- fenced code blocks tagged as YAML;
- standalone files with the extension `.yaml` or `.yml`.

The body of a YAML note belongs to none of these regions. Completions draw on JSON Schema files stored in a configurable directory, and on a schema inferred from the YAML of the vault. These schemas drive completion only, so they do not configure the presentation of keys. YAML Editor highlights the YAML syntax without rendering string values.

## YAML Databases

[YAML Databases](https://github.com/ondreu/YAML-Databases) opens YAML files as a spreadsheet, as a form, or as raw source. The files opened carry the suffix `.yaml.md`, or the plain extension `.yaml` or `.yml`. A file with the suffix `.yaml.md` is a note for Obsidian, so its frontmatter reaches the Properties panel and Bases. The container formed by the suffix `.yaml.md` satisfies the [vault-indexing requirement](requirements.md#^vault-indexing). Ekphrasis adopts the same container. When such a file opens, YAML Databases replaces the Markdown view. The documented views target tabular records, and none of them is documented as rendering values as Markdown.

## YAML Properties

[YAML Properties](https://community.obsidian.md/plugins/yaml-properties) replaces the Properties editor of a note with an editable YAML block in Live Preview. In Reading view, the plugin displays a highlighted block that cannot be edited. YAML Properties leaves the YAML unchanged unless the author edits it. The plugin acts on the frontmatter only, and highlights the YAML syntax without rendering string values.

## Coverage

The four plugins cover each requirement to the following extent:

| Requirement | Nested Properties | YAML Editor | YAML Databases | YAML Properties |
| --- | --- | --- | --- | --- |
| [Structural presentation](requirements.md#^structural-presentation) | partial: frontmatter only | not met: folding of source text | partial: records as spreadsheet or form | not met |
| [Rich content](requirements.md#^rich-content) | not met | not met | not met | not met |
| [Correspondence tables](requirements.md#^correspondence-tables) | not met | not met | partial: records without Markdown cells | not met |
| [Atomic references](requirements.md#^atomic-references) | not met | not met | not met | not met |
| [Markdown links](requirements.md#^markdown-links) | not met | not met | not met | not met |
| [Vault indexing](requirements.md#^vault-indexing) | met for the frontmatter | not met: standalone files | met | met for the frontmatter |
| [Single source](requirements.md#^single-source) | not met: frontmatter rewritten | met | not documented | met |
| [In-place editing](requirements.md#^in-place-editing) | partial: input fields | met | partial: highlighting not documented | met for the frontmatter |
| [Customizable presentation](requirements.md#^customizable-presentation) | not met | not met: schemas drive completion only | not documented | not met |

## Consequences for ekphrasis

Three consequences for the design follow from the coverage:

- The four requirements covered by no plugin form the scope of ekphrasis (rich content, atomic references, Markdown links and customizable presentation).
- Ekphrasis and YAML Databases both replace the Markdown view of files with the suffix `.yaml.md`, so a vault must enable only one of them for these files. ^yaml-databases-conflict
- Nested Properties and YAML Properties remain compatible with ekphrasis, since both act on the frontmatter of a YAML note, and ekphrasis leaves the frontmatter to Obsidian.
