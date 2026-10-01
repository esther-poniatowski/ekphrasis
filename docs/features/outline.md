---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Outline
---
# Outline

The outline displays the structure of the active instance in a side panel, as the [requirement on an outline](../requirements.md#^outline) demands. The outline lets an author move through a long instance, as the core outline of Obsidian does for the headings of a note.

## Entries

Each group, collection and field of the form appears as an entry, nested under the entry of its parent in the order of the form. An entry carries the label of its field. An item of a sequence appears under the value of its first field of kind `label` or `text` when that field is filled, and under its position otherwise.

## Navigation

A click on an entry scrolls the form to the field, expands the collapsed groups containing it, and focuses its control. The outline follows the active form view, and highlights the entry of the focused field. The entries of a group can be folded in the outline independently of the form.

## Issues

The entry of each missing or invalid field carries the marker of its state, in the colours of the form view. The entry of a group displays the number of issues within it, so a folded entry still signals them. A toggle at the top of the panel restricts the outline to the entries with issues, so that an author can proceed through the remaining work.
