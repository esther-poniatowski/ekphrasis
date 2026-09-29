---
tags:
  - index
index: "[ekphrasis documentation](docs/_index.md)"
aliases:
  - Features
---
# Features

Each feature of ekphrasis is specified in one note, by the syntax accepted in a YAML note and by the behaviour of the plugin. Each note states the target behaviour of its feature, whereas the steps already implemented are checked in the [roadmap](../../TODO.md). The notes are listed in dependency order.

- [YAML notes](file-format.md): to create a YAML note, and to know which of its parts Obsidian indexes.
- [Key paths](key-paths.md): to designate a key of a YAML note, in a link, in a view specification or in a program.
- [Default presentation](default-presentation.md): to predict the display of a key covered by no view specification.
- [View specifications](view-specifications.md): to declare how the keys of a family of YAML notes display, without modifying the data.
- [Correspondence tables](correspondence-tables.md): to encode a correspondence between vocabularies so that it renders as a table.
- [Key references](references.md): to link a key of a YAML note from any note, and to keep such links valid when keys change.
- [Links](links.md): to write a link inside a value, and to know how its target resolves.
- [Embedding](embedding.md): to display a YAML note, or a single key of that note, inside another note.
- [Reading and editing modes](editing.md): to switch between the rendered display and the YAML source of a note.
