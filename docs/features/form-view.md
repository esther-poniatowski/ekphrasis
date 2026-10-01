---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Form view
---
# Form view

The form view displays an instance bound to a schema as a form, in which each field is filled in place. Each edit is committed to the file without a submission step, as specified for [saving](saving.md).

## Layout

The fields of the instance appear in the order of the schema. Each field occupies one row with three parts:

- the label, taken from the keyword `title` or else from the key, and marked when the field is required. A declared property without a title displays its key with underscores and hyphens read as spaces, as *empty hint* for `empty_hint`. A key admitted by a pattern, such as an identifier, displays as written;
- the control of its [kind](field-kinds.md), placed in a content area whose background sets it apart from the label;
- a status marker, showing whether the field is filled, missing or invalid.

A group opens a section headed by its label, and the fields of the group are indented under that heading. Each group and each collection can be collapsed and expanded, one at a time, or all at once by the commands *Collapse all* and *Expand all*. When the form opens, the keyword `x-collapsed` of the schema fixes which of them are folded. The layout thereby satisfies the [requirement on visible structure](../requirements.md#^visible-structure).

## Instructions and examples

A help button beside each label displays the instructions and the examples of the field below that label, as the [keywords of the schema](schemas.md#^field-keywords) declare them. A second click hides them, so the form stays compact while the author needs no help, as the [requirement on instructions on demand](../requirements.md#^instructions-on-demand) demands. An empty control displays the first example as placeholder text.

## Rendered values

A field of kind `markdown-line`, `markdown` or `latex` displays its value rendered as in a note, as the [requirement on rendered content](../requirements.md#^rendered-content) demands. A click on the rendered value opens the control on the text of the value, and leaving the control renders the value again. The values render through the renderers of Obsidian, as the decision on [field rendering](../adr/field-rendering.md) records. Therefore, links, callouts and formulas display as in any note.

## Issues

Each missing or invalid field is highlighted, and its messages display below its control. Missing fields and invalid fields take different colours, so an author can finish filling before correcting. A group containing an issue carries a marker in its heading, so a collapsed group still signals its issues. The [outline](outline.md) marks the same fields.

## Locked values

A field can display a value written elsewhere in the file: a value reached through an alias, such as `*nominal`, or merged from another mapping by the key `<<`. The text of such a value lies at its anchor, outside the field. Therefore, the field stays read-only, and a circled question mark follows its label. A click on that symbol reveals, under the field, where the value is edited: at its anchor, or in the merged mapping.

## Keys outside the schema

A key present in the file and absent from the schema displays as YAML text in a read-only area at the end of its group. Such a key can be edited in the source view only. When the schema forbids additional properties, the key also raises an issue.

## Schema defects

A keyword `x-kind` naming no field kind is reported at the top of the form, and its field takes the kind derived from the other keywords. The form cannot open when its schema fails to load: when a schema file is missing or malformed, or when a `$ref` designates no schema. The form view then displays the path of the schema with the reason, and offers to open the source view.

## Source view

The source view displays the YAML text of the instance in an editor with YAML syntax highlighting, as the [requirement on source access](../requirements.md#^source-access) demands. Two controls switch between the form view and the source view:

- a button in the header of the view;
- the command *Toggle form and source view*.

Both views edit the same file, so each view displays the edits of the other after a switch. When the text fails to parse, the form view displays the parse error with its line and its column, and offers to open the source view. The editor of the source view is supplied by ekphrasis, as the decision on the [source view](../adr/source-view.md) records.
