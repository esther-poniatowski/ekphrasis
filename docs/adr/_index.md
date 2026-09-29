---
tags:
  - index
index: "[ekphrasis documentation](docs/_index.md)"
aliases:
  - Architecture decisions
---
# Architecture decisions

Each architecture decision record fixes one design choice, binding on every subsequent change of the code. To let a reader tell whether a changed constraint reopens the choice, each record states three elements:

- the constraints that forced the choice;
- the options weighed against these constraints;
- the consequences of the choice.

Seven records are registered:

- [Markdown projection](markdown-projection.md): to know why the display derives from generated Markdown, and why each block renders into a container of its own.
- [YAML data in notes](yaml-note-container.md): to know why YAML data lives in notes with the suffix `.yaml.md` rather than in standalone files.
- [Key-path references](key-path-references.md): to know why a link designates a key by its path, and how references survive changes of the keys.
- [Anchor declaration](anchor-declaration.md), superseded: to know why labels in comments were considered and then abandoned.
- [Editing in the native editor](native-editor-editing.md): to know why the editing mode reuses the Markdown editor of Obsidian.
- [Presentation in view specifications](view-specification-notes.md): to know why presentation lives in dedicated notes rather than in schema annotations.
- [Correspondence forms](correspondence-forms.md): to know why correspondences use ordinary YAML collections rather than a dedicated table syntax.
