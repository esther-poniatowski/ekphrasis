---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - YAML data in notes
status: proposed
---
# YAML data in notes

> [!QUESTION] Goal: which file holds the YAML data of a project, so that Obsidian indexes it?

Obsidian indexes links, backlinks and properties for notes only. Therefore, the file that holds the data determines whether the links and backlinks of the vault reach the data.

## Decision

YAML data lives in notes with the suffix `.yaml.md`. The body of such a note holds the YAML document, and its optional frontmatter holds metadata, as the specification of [YAML notes](../features/file-format.md) details. Files with the plain extension `.yaml` fall outside the scope of ekphrasis.

## Constraints

- **Vault indexing**: the [requirement on vault indexing](../requirements.md#^vault-indexing) calls for a file treated by Obsidian as a note.
- **Machine readability**: the [requirement on machine readability](../requirements.md#^machine-readability) calls for a file read by a standard YAML parser without preprocessing.
- **Single source**: the data must not be copied into a second file only so that Obsidian indexes the data.

## Options weighed

| Option | Benefit | Cost |
| --- | --- | --- |
| Standalone file with the extension `.yaml` | Every YAML tool recognizes the file by its extension | Obsidian indexes no link of the file, and lists the file only when a plugin registers the extension or the vault detects all extensions |
| Note holding the YAML in a fenced code block | The note is indexed, and Obsidian highlights the block | Obsidian indexes no link inside a code block, and a program must extract the block before parsing it |
| Note with the suffix `.yaml.md` | The note is indexed, its frontmatter becomes properties, and a YAML parser reads it as a stream of documents | A tool that dispatches on the extension no longer recognizes the file, and ekphrasis must replace the Markdown view |

## Consequences

- The reading mode replaces the Markdown view of a YAML note when the note opens. YAML Databases replaces the same view, so the two plugins conflict.
- Obsidian parses the body of a YAML note as Markdown, so the links on [lines read as code](../features/file-format.md#^indexing-limitation) escape its index.
- YAML Editor no longer applies to the data, since the body of a note belongs to none of the regions handled by YAML Editor. This loss motivates the [editing in the native editor](native-editor-editing.md) and the [presentation in view specifications](view-specification-notes.md).
- The setting of the current code that registers the extensions `.yaml` and `.yml` is retired, as the [roadmap](../../TODO.md) records.
