# Changelog

Every notable change to the project is recorded in this changelog. The format follows [Keep a Changelog](https://keepachangelog.com/). The version numbers follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Domain model of YAML documents, carrying source ranges.
- Source tree in four layers: `domain`, `application`, `infrastructure` and `adapters`.
- Development toolchain that builds, type-checks, lints, formats and tests the code (esbuild, tsc, ESLint, Prettier and Vitest, respectively), with components written in TSX for Preact, and component tests in the simulated DOM happy-dom with the Testing Library of Preact.
- Boundaries between layers, enforced by ESLint, which admit the libraries `obsidian`, `preact` and CodeMirror in the adapters layer only.
- View of ekphrasis for the files `.yaml` and `.yml`, holding a form view and a source view with YAML highlighting.
- Switch between the form view and the source view, by a header button and by the command *Toggle form and source view*.
- Notice reporting an extension already owned by another plugin, and the command *Open in ekphrasis*.
- Binding of each instance to its schema, by a modeline or by the path rules of the settings tab.
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

### Changed

- Message of a file bound to no schema, laid out as a heading followed by the two methods of binding it.
- Cleared item of a sequence kept at its position with the unfilled value, instead of a refused commit.
- Modeline in the message of an unbound file, placed after the words *at the top of the file*.
- Title of the box of issues, reduced to the counts of each kind and written in the colour of errors, such as `Validation: 3 missing fields, 1 warning`.
- Messages of the box of issues and of the box of schema defects, aligned after the longest path.
- Scenario records of the manual tests written with empty values as their unfilled values, without `x-unfilled: [open]` in their schemas.
- Box of issues at the top of the form, holding one line per kind of issue with the names of the fields concerned, each moving the form to its field, in place of a title listing the counts.

### Fixed

- Value of a single-line kind written plain or single-quoted, instead of keeping the block style of the previous value.
