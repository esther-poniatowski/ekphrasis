---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Editing in the native editor
status: proposed
---
# Editing in the native editor

> [!QUESTION] Goal: which editor modifies the text of a YAML note?

The [requirement on in-place editing](../requirements.md#^in-place-editing) calls for YAML highlighting inside Obsidian. The text to edit is the body of a note, as the decision on [YAML data in notes](yaml-note-container.md) fixes. Each candidate editor leaves a different set of functions for ekphrasis to maintain.

## Decision

The editing mode opens a YAML note in the Markdown editor of Obsidian, in source mode. An editor extension of ekphrasis highlights the YAML syntax, as the [reading and editing modes](../features/editing.md) specify.

## Constraints

- **In-place editing**: the text must be editable inside Obsidian, with YAML highlighting.
- **Single source**: the file must change through edits of its text only, as the [single-source requirement](../requirements.md#^single-source) demands.
- **Maintenance**: the functions already provided by the editor of Obsidian must not be implemented again.

## Options weighed

| Option | Benefit | Cost |
| --- | --- | --- |
| Editor built by ekphrasis inside its own view | Full control of the YAML functions, such as completion | Every function of the editor of Obsidian must be rebuilt (e.g. search, Vim mode, undo history) |
| Editing delegated to YAML Editor | Completion and diagnostics already exist | YAML Editor acts on the frontmatter, on fenced blocks and on standalone files, but the body of a YAML note belongs to none of these regions |
| Markdown editor of Obsidian in source mode, with an editor extension for YAML highlighting | Every function of the editor remains available, and the extension adds the highlighting only | Completion and diagnostics are absent, and Live Preview must be excluded |

## Consequences

- Obsidian supplies the core packages of its editor without a YAML language, so the YAML language mode is bundled with the plugin. Therefore, the bundler configuration must exclude the package of that language mode from the packages treated as external.
- A YAML note switched to the editing mode opens in source mode, since Live Preview displays a YAML comment at the start of a line as a heading.
- Completion and diagnostics remain open for subsequent work.
