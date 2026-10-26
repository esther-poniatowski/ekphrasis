---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - List layouts
status: accepted
---
# List layouts

> [!QUESTION] Goal: how does a field of kind `list` select and retain its layout?

A field of kind `list` can place its items inline or on separate rows. Both controls edit the same items. Inline controls reduce the height of short lists. By contrast, separate rows make the boundary of each item visible.

## Decision

A field of kind `list` opens in the compact layout by default. Its schema may declare `x-list-layout: compact` or `x-list-layout: expanded` to select another initial layout.

A control at the field toggles the layout. The current view keeps the chosen layout while it displays the file. When the view closes or opens another file, it forgets that choice. Therefore, reopening the file restores the layout declared by the schema, or the compact default. The toggle changes no text in the file or its schema.

## Constraints

- **Compact short lists**: a list with few scalar items must not require one row per item.
- **Equivalent editing**: both layouts must let the author edit, reorder, add and remove individual items.
- **Predictable opening**: the initial layout must not change when the number of items crosses a threshold.
- **Schema control**: a schema author must be able to choose the initial layout of a field.
- **Unchanged source**: changing the layout must not edit the source file.
- **Bounded state**: the first implementation must not remember a layout after its current view ends.

## Alternatives

### Initial layout

Three candidates determine the initial layout:

| Option | Benefit | Cost |
| --- | --- | --- |
| Compact default with a schema override | Short lists occupy little height, and the schema can expose one row per item where needed | Dense controls can obscure how to edit an item |
| Expanded default with a schema override | Every item and its controls start on a separate row, and the schema can compact selected fields | Short lists keep the vertical cost that motivates the second layout |
| Layout derived from the number of items | Short lists start compact and long lists expose their items | Adding or removing one item can change the layout at a threshold unrelated to the intent of the schema author |

The compact default keeps short lists compact. The schema override keeps the initial layout independent of the current data.

### Lifetime of a manual choice

Five candidates determine how long a manual choice lasts:

| Option | Benefit | Cost |
| --- | --- | --- |
| Current view | No stored state or storage key, and reopening the file restores its declared initial layout | An author repeats the toggle after reopening the file |
| Until Obsidian closes | A choice survives reopening a file without entering the vault | The plugin must key and expire each choice by file and field |
| Remember by file and field | Each field reopens as the author last left it | Renaming a file or field invalidates the stored key or leaves stale state |
| Remember by schema field | One choice applies to the field in every file bound to the schema | A personal choice silently overrides the initial layout selected by the schema author |
| Write the layout into the record | The choice travels with the file | Interface state becomes record data, and the toggle edits the source file |

The first implementation remembers a choice in the current view only. To remember a choice beyond that view, the project must choose again. Any persistent design must assign an owner and a storage key. The persistent design must specify its response to renames. The same design must define whether stored state overrides `x-list-layout`.

### Invalid declarations

An invalid value of `x-list-layout` selects no layout, so the field uses the compact default. On a field of another kind, the keyword has no effect. Two responses remain possible. The plugin may report the invalid or misplaced keyword as a schema defect. Alternatively, the plugin may ignore the keyword, as it ignores unknown extension keywords.

## Consequences

The selected design requires five properties:

- The schema dialect gains the field keyword `x-list-layout`, with the values `compact` and `expanded`.
- The list control keeps the manual choice in view state while the current view displays the file.
- A change to the items does not select another layout automatically.
- Before implementation, decide whether an invalid or misplaced `x-list-layout` raises a schema defect.
- Remembering a choice beyond the current view remains a separate feature.
