# Changelog

Every notable change to the project is recorded in this changelog. The format follows [Keep a Changelog](https://keepachangelog.com/). The version numbers follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Domain model of YAML documents, carrying source ranges.
- Source tree in four layers: `domain`, `application`, `infrastructure` and `adapters`.
- Development toolchain that builds, type-checks, lints, formats and tests the code (esbuild, tsc, ESLint, Prettier and Vitest, respectively), with components written in TSX for Preact.
- Boundaries between layers, enforced by ESLint, which admit the libraries `obsidian`, `preact` and CodeMirror in the adapters layer only.
- View of ekphrasis for the files `.yaml` and `.yml`, holding a read-only form view and a source view with YAML highlighting.
- Switch between the form view and the source view, by a header button and by the command *Toggle form and source view*.
- Notice reporting an extension already owned by another plugin, and the command *Open in ekphrasis*.
- Binding of each instance to its schema, by a modeline or by the path rules of the settings tab.
- Loading of schemas written in JSON or in YAML, with references across files.
- Form model, with the kind of each field declared by `x-kind` or derived from the standard keywords, and one control per scalar kind.
- Labels of declared properties without a title, read with their underscores and hyphens as spaces.
