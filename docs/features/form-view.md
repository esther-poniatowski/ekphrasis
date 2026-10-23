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

- the label, taken from the keyword `title` or else from the key, and marked when the schema requires the field, or when a [conditional rule](#^conditional-controls) requires it under the current values. A declared property without a title displays its key with underscores and hyphens read as spaces, as *empty hint* for `empty_hint`. A key admitted by a pattern, such as an identifier, displays as written;
- the control of its [kind](field-kinds.md), placed in a content area whose background sets it apart from the label;
- a status marker, showing whether the field is filled, missing or invalid.

A group opens a section headed by its label, and the fields of the group are indented under that heading, along a vertical guide that marks the extent of the group. Each group and each collection can be collapsed and expanded. The button at the start of its heading folds it alone. The commands *Collapse all* and *Expand all* fold or unfold every section at once, as do the two buttons of the same names in the header of the view. These buttons display in the form view only. When the form opens, the keyword `x-collapsed` of the schema fixes which of them are folded.

Each item of a sequence carries two buttons moving it one position up or down, and a button removing it. Each entry of a mapping keyed by identifiers carries a button removing it. A button below each collection adds an item, a row or an entry. The new entry displays as a draft until a value is committed inside it, as specified for [saving](saving.md#^structural-edits). The layout thereby satisfies the [requirement on visible structure](../requirements.md#^visible-structure).

## Text and focus

The text of the form can be selected and copied, including the labels, the schema path and the messages. When the author returns to the view, the focus returns to the field that held it last, unless the click that returns to the view focuses another field.

## Instructions and examples

A help button beside each label displays the instructions and the examples of the field below that label, as the [keywords of the schema](schemas.md#^field-keywords) declare them. A second click hides them, so the form stays compact while the author needs no help, as the [requirement on instructions on demand](../requirements.md#^instructions-on-demand) demands. The button responds to a click, and to the keys `Enter` and `Space` while it holds the focus. The button ignores hover, since touch devices have no hover. A field carries the button when its schema declares the keyword `description` or `examples`. The instructions are rendered as Markdown, and the examples follow them, each written as in the file. The button shows the information icon, distinct from the circled question mark of a locked value. Three places carry the button besides the label of a scalar field:

- the heading of a group or a collection, whose instructions display below the heading, also while the section is folded;
- the header of each column of a table, whose instructions display above the table under the name of the column, since the cells of a column share them;
- the title of the form, for the instructions of the root schema.

The instructions of every field show at once through the button with the information icon in the header of the view, or through the command *Show or hide all instructions*. Once every instruction is shown, the same button or command hides them all. The button displays in the form view only, and is marked as active while every instruction is shown. The folding of the sections stays unchanged: the instructions of a folded group display below its heading, and those of its fields display once it unfolds. A help button still shows or hides the instructions of its own field afterwards.

An empty control displays the first example as placeholder text, after the mark `—` of an [unfilled value](#^unfilled-display).

## Rendered values

A field of kind `markdown-line`, `markdown` or `latex` displays its value rendered as in a note, as the [requirement on rendered content](../requirements.md#^rendered-content) demands. A click on the rendered value opens the control on the text of the value, and leaving the control renders the value again. The focus reached by the keyboard opens the control as a click does. The values render through the renderers of Obsidian, as the decision on [field rendering](../adr/field-rendering.md) records. Therefore, links, callouts and formulas display as in any note. A value of kind `markdown-line` displays inline, and a value of kind `latex` as a display formula. The formula is centred in its control or its cell, unless the keyword `x-align` of its schema sets it on the left. Three cases depart from the click that opens the control:

- an empty value displays its control at once, with its placeholder;
- a read-only value, locked or disabled, displays rendered, and a click on it opens no control;
- a click on a link of the rendered value follows the link, and an internal link opens its note, resolved from the folder of the instance.

Each rendering blocks input for a few milliseconds, so the values of a long instance render in batches. The values that enter the visible area render first, in the order of the form, and the other values follow. A batch renders at most fifteen values, and ends earlier once 40 ms have elapsed. Therefore, a batch of long values stays under 50 ms, since the browser counts a longer task as blocking input. Between two batches, the form yields to input. Until its rendering runs, a value displays as its plain text. A batch longer than 50 ms is reported in the developer console, with its number of values. ^batched-rendering

## Unfilled values

The control of a field displays no value when the field holds an [unfilled value](schemas.md#^unfilled-values): the null value, or any value of the keyword `x-unfilled`, such as `open`. Therefore, the author never reads an unfilled value as an answer. Each control marks its empty state by the sign `—`: ^unfilled-display

- a text control displays `—` as placeholder text, followed by the first example of the field when the field has one;
- a dropdown selects its empty option, labelled `—`, and lists no unfilled value among its options;
- a toggle has no empty state, so it displays turned off and followed by `—`.

The file keeps its unfilled value, and a cleared required field receives the first unfilled value of the schema, as specified for [cleared values](saving.md#^cleared-values).

## Issues

Each missing or invalid field is highlighted, and its messages display below its control. Missing fields and invalid fields take different colours, so an author can finish filling before correcting. A missing field takes the accent colour of the required marker, and an invalid value the colour of errors. A group containing an issue carries the number of its issues in its heading, so a collapsed group still signals its issues. The [outline](outline.md) marks the same fields.

The top of the form summarizes the issues of the instance in a box titled *Validation*, written in the colour of errors. The box holds one line for each mark of issue present: missing fields, invalid values, then warnings. Each line opens with the count of its issues, such as `3 missing fields`, and names each field holding an issue of that kind. A click on a name moves the form to its field, as a click on an entry of the [outline](outline.md) does. Several fields can share one label, so a field is named by the trail of the names from the top of the form, such as `rows › bob › name`, with each item named as in the outline. Under these lines, the box lists each issue whose path designates no field of the form, with its path. Such an issue concerns the root, or a required property absent from the properties of its group. The same property is also reported as a defect of the schema. This box and the box of schema defects align the start of their messages after the longest path.

## Conditional rules

Two rules of [validation](validation.md) also act on the controls: `required-when` and `forbidden-when`. Therefore, the author sees which fields the current values require or forbid, without discovering the rules by trial. Each rule acts while its condition holds under the current values: ^conditional-controls

- a field required by a rule `required-when` is marked as required, like a field required by the schema;
- an unfilled field forbidden by a rule `forbidden-when` is disabled and greyed, together with the fields inside it. A note below the field states the condition, such as *This field stays unfilled while `aim` equals `description`.*

When a forbidden field still holds a value, the field stays editable, since a disabled control cannot clear its value. Its issue displays below its control, in the colour of its severity. Once its value is cleared, the field is disabled. The standard keywords `if`, `then`, `else` and `dependentRequired` change no control: their conditions are reported as issues only.

## Locked values

A field can display a value written elsewhere in the file: a value reached through an alias, such as `*nominal`, or merged from another mapping by the key `<<`. The text of such a value lies at its anchor, outside the field. Therefore, the field stays read-only, and a circled question mark follows its label. A click on that symbol reveals, under the field, where the value is edited: at its anchor, or in the merged mapping.

## Keys outside the schema

A key present in the file and absent from the schema displays as YAML text in a read-only area at the end of its group. Such a key can be edited in the source view only. When the schema forbids additional properties, the key also raises an issue.

## Schema defects

A keyword `x-kind` naming no field kind is reported at the top of the form, and its field takes the kind derived from the other keywords. Four defects found by [validation](validation.md) are reported in the same place:

- a malformed rule declaration;
- a schema refused by the validator;
- a required property absent from the properties of its group and of the alternatives of its group, since the form displays no field for it. The property may be required by a rule `required-when`, or by a keyword `required` or `dependentRequired` applying to the group, such as one inside a branch `then`;
- a value of the keyword `x-unfilled` enumerated by a field, through `enum`, `const` or a `oneOf` of `const` values, since the form displays that value as an empty control.

The last two defects concern the schema alone, so each is reported once per field schema. Its path holds `[*]` for the items of a sequence, and `*` for the entries of a mapping. The form cannot open when its schema fails to load: when a schema file is missing or malformed, or when a `$ref` designates no schema. The form view then displays the path of the schema with the reason, and offers to open the source view.

## Source view

The source view displays the YAML text of the instance in an editor with YAML syntax highlighting, as the [requirement on source access](../requirements.md#^source-access) demands. Two controls switch between the form view and the source view:

- a button in the header of the view;
- the command *Toggle form and source view*.

A pane in the source view stays in the source view when another file opens in it, as the user decided on 2026-10-20, so an author editing YAML text moves from file to file in that view. This rule holds for a source view chosen by the author. The source view displayed for a file bound to no schema, or after a failure of the form, ends with its file. A note opened in the pane replaces the view of ekphrasis, so the next YAML file opened there displays its form.

Both views edit the same file, so each view displays the edits of the other after a switch. When the text fails to parse, the form view displays the parse error with its line and its column, and offers to open the source view. A form displayed before the error stays visible under the error, as specified for [changes from outside](saving.md). The editor of the source view is supplied by ekphrasis, as the decision on the [source view](../adr/source-view.md) records.
