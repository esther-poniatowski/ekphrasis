---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Plain YAML instances
status: accepted
---
# Plain YAML instances

> [!QUESTION] Goal: which file holds an instance filled through a form?

An instance is filled by a person and read by programs. The file holding it determines the parser that programs must apply, and the view of Obsidian that opens it. The projects served by ekphrasis already store their records as files with the extension `.yml`.

## Decision

An instance is a standalone file with the extension `.yaml` or `.yml`, as the specification of [YAML instances](../features/instance-files.md) details. Ekphrasis registers both extensions and opens these files in its own view.

## Constraints

- **Machine readability**: the [requirement on machine readability](../requirements.md#^machine-readability) calls for a file read by a standard YAML parser without preprocessing.
- **Source preservation**: the [requirement on source preservation](../requirements.md#^source-preservation) calls for a file whose text changes only at the edited value.

## Options weighed

| Option | Benefit | Cost |
| --- | --- | --- |
| Standalone file with the extension `.yaml` or `.yml` | Every YAML tool recognizes the file | Obsidian indexes no link written in the file, and a plugin must register the extensions to open it |
| Note whose name ends with the suffix `.yaml.md`, holding a frontmatter and a YAML body | Obsidian indexes the links of the values and the properties of the frontmatter | A parser reads a stream of two documents and must select the last one, and the Markdown parser of Obsidian reads some indented YAML lines as code |
| Note holding the YAML in a fenced code block | Obsidian highlights the block | A program must extract the block before parsing it, and Obsidian indexes no link inside the block |

## Consequences

- The links written in values are absent from the backlinks and from the graph of the vault. The projects served reference other records by identifiers and by paths, so none of their fields relies on this index.
- Ekphrasis registers the extensions also registered by other plugins that open `.yaml` or `.yml` files, such as YAML Editor and YAML Databases. Obsidian assigns each extension to the first plugin that registers it, and refuses every later registration with the error `Attempting to register an existing file extension`. This rule was confirmed with YAML Editor on 2026-10-01, with each plugin loaded first in turn. In both runs, the plugin loaded second received the error, and the files opened in the view of the plugin loaded first. In the test, the plugins loaded in the order in which they were enabled, and a restart kept that order. Therefore, a vault must not enable another such plugin together with ekphrasis. Ekphrasis must also catch the error, since an uncaught error stops the plugin from loading. ^extension-conflict
- The Markdown editor of Obsidian does not open these files, so the source view needs an editor of its own, as the decision on the [source view](source-view.md) records.
