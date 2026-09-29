---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Links
---
# Links

Values of a YAML note accept the two link formats of Obsidian: wikilinks and Markdown links. Ekphrasis renders and resolves both formats as in a note of the same folder. Therefore, both formats satisfy the [requirement on Markdown links](../requirements.md#^markdown-links). The YAML syntax preserves a link only under the [scalar styles for rich values](../guide/authoring-yaml.md).

## Resolution

The YAML note is the source of every link written in its values. Therefore, a wikilink resolves by note name, as in every note of the vault. A Markdown link resolves by the same procedure as in a note of the same folder, so a relative path starts from the folder of the YAML note. A space in the path of a Markdown link must be encoded as `%20`, as in any note.

## Rendering

When a value displays as Markdown, inline or in blocks, its links can be followed. When a value displays as code or as a formula, its links remain source text. Following a link in the reading mode opens its target. When the subpath of the link is a key path, the reading mode also scrolls to that key, as specified for [key references](references.md).

## Indexing and renaming

Obsidian indexes the links of the body, except the links on [lines read as code](file-format.md#^indexing-limitation). When the Obsidian setting for updating internal links is enabled, Obsidian rewrites every indexed link whose target is renamed.

> [!WARNING] Renaming
> A link rewritten by Obsidian after a rename can break the YAML syntax of an unquoted value. The syntax breaks, for instance, when the new name contains a colon followed by a space. Block scalars are not affected, since their content admits any character.
