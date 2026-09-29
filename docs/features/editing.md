---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Reading and editing modes
---
# Reading and editing modes

A YAML note offers two modes, so that the same note can be read as a rendered document and edited as YAML text within Obsidian:

- a reading mode, rendered by ekphrasis;
- an editing mode, in the Markdown editor of Obsidian with YAML syntax highlighting.

The editing mode satisfies the [requirement on in-place editing](../requirements.md#^in-place-editing).

## Reading mode

Ekphrasis substitutes the reading mode for the Markdown view of a YAML note, so opening the note displays the reading mode. The reading mode never writes to the file, as the [requirement on a single source](../requirements.md#^single-source) demands. The reading mode renders the note again whenever the file changes. When the body fails to parse, the reading mode displays the error with its line and its column. The last version that parsed stays rendered below the error.

## Editing mode

The editing mode opens the YAML note in the Markdown editor of Obsidian, in source mode. Therefore, every function of that editor remains available (e.g. search, undo history, keyboard shortcuts). The editing mode excludes Live Preview, since Live Preview displays a YAML comment placed at the start of a line as a Markdown heading. In every file whose name ends with the suffix `.yaml.md`, an editor extension added by ekphrasis highlights the YAML syntax. Every edit modifies the text directly, so comments and scalar styles are preserved.

## Switching modes

Two controls switch a YAML note between the modes:

- a button in the header of the view;
- the command *Toggle reading and editing mode*.
