---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Outline
---
# Outline

The outline displays the structure of the active instance in a side panel, as the [requirement on an outline](../requirements.md#^outline) demands. The outline lets an author move through a long instance, as the core outline of Obsidian does for the headings of a note.

The panel opens in the right sidebar at the first load of the plugin, so its tab sits beside the outline and the backlinks of Obsidian, and it follows the active form without any command. The data of the plugin records that first opening. Afterwards, the workspace restored by Obsidian decides, as for the panels of Obsidian itself: it holds the panel at the next launch, so no second panel opens, unless the author closed the panel, which then stays closed. The command *Show outline* reveals the panel, and opens it again after the author closed it. The panel takes the style of the outline of Obsidian: each entry is drawn as an item of its tree, with the triangle folding its entries, the guide along its nested entries, and the highlight of the focused entry, in the colours and the sizes of the theme.

## Entries

Each group, collection and field of the form appears as an entry, nested under the entry of its parent in the order of the form. An entry carries the label of its field. An item of a sequence appears under the value of its first field of kind `label` or `text` when that field is filled, and under its position otherwise. The items of a list of scalars carry no entries, since each such item is a value rather than a field to reach: the entry of the list counts their issues. The summary of issues still names a scalar item of kind `label` or `text` by its own value. A field of kind `alternatives` holds the entries of the alternative that its value matches. The values checked in a field of kind `choices` form one control, so they carry no entries of their own.

## Navigation

A click on an entry scrolls the form to the field, expands the collapsed groups containing it, and focuses its control. The field reached is outlined briefly in the accent colour. A group or a collection reached focuses the button folding it. The outline follows the active form view, and highlights the entry of the focused field. The outline keeps following the last active view of an instance while another view is active, such as the outline itself. While that view displays the source view, the outline still lists the entries, and a click opens the form view. The entries of a group can be folded in the outline independently of the form. At the top of the panel, the button *Collapse all* folds every entry of the outline at once, and the button *Expand all* unfolds every entry. The sections of the form keep their state.

## Issues

The entry of each missing or invalid field carries the marker of its state, in the colours of the form view, and so does the entry of a field holding a warning. The entry of a group or a collection displays the number of issues within it, so a folded entry still signals them. A toggle at the top of the panel restricts the outline to the entries with issues, so that an author can proceed through the remaining work.

## Search

A search field at the top of the panel finds the fields whose name or key holds every word typed. The search ignores case, and reads underscores and hyphens as spaces, so `epistemic_aim` and `aim epistemic` both find the field *epistemic aim*. While the search field holds text, a cross at its end clears the field. The focus stays in the search field, so the author types the next query at once. While the search field holds text, the panel lists the results in place of the entries, each with the names of the entries containing it. Choosing a result, by a click or by the key Enter for the first one, moves the form to its field and shows its instructions, as the help button of the field does. Therefore, an author finds a field and reads its instructions in one step. The command *Search the fields* opens the panel with the focus in the search field.
