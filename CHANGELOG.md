# Changelog

Every notable change to the project is recorded in this changelog. The format follows [Keep a Changelog](https://keepachangelog.com/). The version numbers follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Icon of the kind of each field at the left of its label, drawn from the Lucide set of Obsidian, with the icons of the property types of Obsidian for the closest kinds.
- Outline opened in the right sidebar at the first load of the plugin, beside the outline and the backlinks of Obsidian; a closed outline stays closed at the next loads.

### Changed

- Fields displayed as concise rows, as the properties of a note, with their names in bold and the help button closing the label on its right.
- One font size and one appearance for every control holding text, in a row as in a cell: the font size of the inputs of Obsidian, and the fill, the gray border and the rounded corners of the form fields of the theme.
- Marks of the issues of a field drawn as a bar beside its control, so they no longer move the control.
- Help buttons of the headers of a table set apart from the names of their columns.
- Descriptions of the options of a choice listed with the instructions of the field, on demand, instead of below the dropdown.
- Long values of the kinds `text`, `markdown-line` and `latex` wrapped in their inputs, which grow to show the whole value; the key `Enter` commits the value, and a pasted line break becomes a space, so the file keeps the value on one line. A value already holding a line break keeps its line breaks.
- Lighter vertical guide along the fields of each nested group.
- Outline drawn in the style of the outline of Obsidian, without entries for the items of the lists of scalars.

### Removed

- Messages *No items.*, *No rows.* and *No entries.* of the empty collections that a button or an input extends.

## [0.1.0] - 2026-10-29

### Added

- Domain model of YAML documents, carrying source ranges.
- Source tree in four layers: `domain`, `application`, `infrastructure` and `adapters`.
- Development toolchain that builds, type-checks, lints, formats and tests the code (esbuild, tsc, ESLint, Prettier and Vitest, respectively), with components written in TSX for Preact, and component tests in the simulated DOM happy-dom with the Testing Library of Preact.
- Boundaries between layers, enforced by ESLint, which admit the libraries `obsidian`, `preact` and CodeMirror in the adapters layer only.
- View of ekphrasis for the files `.yaml` and `.yml`, holding a form view and a source view with YAML highlighting.
- Switch between the form view and the source view, by a header button and by the command *Toggle form and source view*.
- Notice reporting an extension already owned by another plugin, and the command *Open in ekphrasis*.
- Binding of each instance to its schema, by a modeline or by the path rules of the settings tab.
- Binding of a record by its top-level field `_schema`, whose logical identifier resolves through the registry named by the setting *Schema registry*, before the modeline and the path rules. The form omits `_schema`, and a schema whose `_schema` declares another identifier is refused.
- Loading of schemas written in JSON or in YAML, with references across files.
- Form model, with the kind of each field declared by `x-kind` or derived from the standard keywords, and one control per scalar kind.
- Labels of declared properties without a title, read with their underscores and hyphens as spaces.
- Saving of scalar fields from the form, when a control loses the focus, when typing pauses, and at each change of a dropdown, a toggle or a checkbox. Each commit changes only the text of its value, and is confirmed by parsing the new text.
- Insertion of the key of an absent field, removal of the key of a cleared optional field, and the unfilled value of the schema at a cleared required field.
- Setting *Commit delay*, the pause of typing after which a text field saves its value.
- Commits kept while the text of the file reloads or fails to parse, and applied once the text parses again.
- Selection of the text of the form, and the focus returned to the last field when the author comes back to the view.
- Parse error of an unclosed bracket or brace placed at that bracket.
- Validation of each instance when it opens and after each commit: unfilled values set apart first, then the standard keywords of JSON Schema checked by Ajv, the keyword `format` included through `ajv-formats`, then the rules of `x-rules` and the rules implied by the kinds `label` and `markdown-line`.
- Predefined checkers `word-count`, `sentence-count`, `inline-markdown`, `latex`, `unique-by`, `sorted-by`, `compare`, `required-when` and `forbidden-when`, with field paths written from the declaring field and wildcards bound to the same item.
- Unfilled values of any JSON form under `x-unfilled`, such as the empty sequence `[]`.
- Issues displayed at their fields, counted in the headings of groups and at the top of the form, with missing fields marked apart from invalid values.
- Command *Validate instance*, with a notice counting the issues of each kind.
- Schema defects for a required property absent from the properties of its group, and for a value of `x-unfilled` that a field enumerates.
- Every unfilled value, the null value or a value of `x-unfilled`, displayed as an empty control marked `—`.
- Conditional rules reflected in the controls: a field required by `required-when` is marked as required, and an unfilled field forbidden by `forbidden-when` is disabled, with a note stating the condition.
- Controls of the collection kinds: tables for `table` and `keyed-table`, checkboxes for `choices`, collapsible groups for `records` and `keyed-records`, and a selector for `alternatives`.
- Items, rows and entries added as drafts, written by their first value, and moved or removed by buttons, with identifiers of items kept across reorderings.
- Insertion and removal of the entries of flow collections with their separating commas, keeping the flow form, and of block collections with the indentation of their siblings.
- New collection under a key of a block mapping written in flow form when every sibling holding that key writes it in flow form, such as `signature: [t]` in a new row.
- Switch of alternative removing the keys of the previous alternative only, after a confirmation listing the fields whose filled values would be lost.
- Folding of each group and collection, following `x-collapsed` when the form opens, the commands *Collapse all* and *Expand all*, and a vertical guide along each group.
- New string written in the quoted style shared by its siblings, such as a double-quoted name in a new row whose neighbouring names are double-quoted.
- Source view chosen by the author kept in its pane when another YAML file opens there.
- Instructions and examples of a field displayed on demand, by a help button beside its label, in the heading of its section, in the header of its column, or beside the title of the form.
- Values of kind `markdown-line`, `markdown` and `latex` displayed through the renderers of Obsidian and edited after a click, the visible values rendered first, in batches that yield to input.
- Outline of the active form in a side panel, with the marks of issues, the restriction to the entries with issues, and a search that moves the form to a field and shows its instructions, opened by the commands *Show outline* and *Search the fields*.
- Cross clearing the search field of the outline.
- Buttons folding and unfolding every section, in the header of the form view, and every entry, at the top of the outline.
- Keyword `x-align`, `left` or `center`, aligning the formula of a field of kind `latex` in its control or its table cell, `center` by default.
- Following of field links by path, from a note or from a value of a form. A followed link opens the instance in the form view at the designated field, and a notice names a field path that is malformed or designates no field.
- Field links by identifier, written as URIs `obsidian://ekphrasis?id=…&field=…`, resolved through an index of the record identifiers of the vault. The index follows the changes of the vault and of the path rules, and a notice lists the files of an ambiguous identifier.
- Keyword `x-identifier` at the root of a schema, naming the field of the identifier of a record, with a schema defect when it designates no declared field.
- Command *Copy link to field*, copying a link by identifier when no other file declares the identifier of the record, and else a link by path in the link format of Obsidian. The text of a link to an item joins the label of its list and the position of the item, such as `Foils #2`.
- Suggestions of the field paths of a YAML instance after the hash sign of a Markdown link.
- Button of the header of the form view, and commands *Show all instructions* and *Hide all instructions*, showing or hiding the instructions of every field at once.
- Keyword `x-identifier: id` in the gnomon fixtures.

### Changed

- Message of a file bound to no schema, laid out as a heading followed by the two methods of binding it.
- Cleared item of a sequence kept at its position with the unfilled value, instead of a refused commit.
- Modeline in the message of an unbound file, placed after the words *at the top of the file*.
- Title of the box of issues, reduced to the counts of each kind and written in the colour of errors, such as `Validation: 3 missing fields, 1 warning`.
- Messages of the box of issues and of the box of schema defects, aligned after the longest path.
- Scenario records of the manual tests written with empty values as their unfilled values, without `x-unfilled: [open]` in their schemas.
- Box of issues at the top of the form, holding one line per kind of issue with the names of the fields concerned, each moving the form to its field, in place of a title listing the counts.
- Help button toggling its instructions when `Enter` or `Space` is pressed on it, without relying on the host to activate the button, so that one press toggles once.
- Help button of the title of the form set apart from its last letter.

### Fixed

- Value of a single-line kind written plain or single-quoted, instead of keeping the block style of the previous value.
