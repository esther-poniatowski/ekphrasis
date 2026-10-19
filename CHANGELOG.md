# Changelog

Every notable change to the project is recorded in this changelog. The format follows [Keep a Changelog](https://keepachangelog.com/). The version numbers follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Domain model of YAML documents, carrying source ranges.
- Source tree in four layers: `domain`, `application`, `infrastructure` and `adapters`.
- Development toolchain that builds, type-checks, lints, formats and tests the code (esbuild, tsc, ESLint, Prettier and Vitest, respectively), with components written in TSX for Preact.
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

### Changed

- Message of a file bound to no schema, laid out as a heading followed by the list of the two ways of binding it.

### Fixed

- Value of a single-line kind written plain or single-quoted, instead of keeping the block style of the previous value.
