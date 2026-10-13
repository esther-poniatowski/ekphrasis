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
