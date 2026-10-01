---
tags:
  - architecture
index: "[Architecture](docs/architecture/_index.md)"
aliases:
  - Layers and dependency rule
---
# Layers and dependency rule

Four layers divide the source code of ekphrasis, and each layer depends only on the layers closer to the domain. The domain layer depends on no library and on no host application. The form model and the text of each commit are computed in the domain, so unit tests cover them outside Obsidian. From the domain outward, the four layers are the following:

| Layer | Folder | Responsibility | Admitted dependencies |
| --- | --- | --- | --- |
| Domain | `src/domain/` | Form model built from a schema and an instance, field kinds, field paths, unfilled values, predefined checkers, issues, scalar styles and text of an edited node | None |
| Application | `src/application/` | Ports, use cases (opening a form, committing an edit, creating an instance, validating), model of the settings | Domain |
| Infrastructure | `src/infrastructure/` | Port implementations that call third-party libraries or Node (e.g. the YAML parser, the JSON Schema validator, the Python process) | Domain, application |
| Adapters | `src/adapters/` | Composition root, and every module that calls the API of Obsidian (e.g. views, commands, settings tab) | All layers |

The dependency rule is enforced by the ESLint configuration `config/tools/eslint.config.mjs`, so an import that breaks the rule fails the lint check. The same check forbids the API of Obsidian, the interface library Preact and the editor library CodeMirror in every layer except the adapters, and the YAML parser in the domain and application layers. Any other library is excluded from the domain by convention only, since no lint rule forbids such a library.

Two files of the folder `src/` lie outside the four layer folders:

- the error hierarchy `src/errors.ts`, shared by all layers;
- the entry point `src/main.ts`, exporting only the plugin class.

## Features across layers

The code of each feature is divided according to whether it calls the API of Obsidian. The parts that call this API lie in the adapters layer, since no other layer admits this API, and the other parts lie in the inner layers. Each feature is planned to split across the layers as follows:

| Feature | Domain | Application | Infrastructure | Adapters |
| --- | --- | --- | --- | --- |
| [YAML instances](../features/instance-files.md) | Reading of the modeline, matching of path rules, resolution of the schema | Model of the settings | — | Registration of the extensions, path rules in the settings tab |
| [Schemas](../features/schemas.md) | Interpretation of a schema with its references resolved: kind, rules, unfilled values | Port for loading schemas | Loader of the JSON and YAML schema files reached by `$ref` | — |
| [Field kinds](../features/field-kinds.md) | Derivation of the kind of each field | — | — | One control per kind |
| [Field paths](../features/field-paths.md) | Parser of field paths, matching of paths against the instance | — | — | — |
| [Instance creation](../features/instance-creation.md) | Skeleton of a new instance | Use case that creates an instance | — | Commands, choice of the schema and of the path |
| [Form view](../features/form-view.md) | Form model | Use case that opens a form | — | Form view, rendered values, source view |
| [Outline](../features/outline.md) | — | — | — | Outline view |
| [Saving](../features/saving.md) | Scalar style and text of an edited node | Use case that commits an edit, port for the YAML document | Splice into the source text, check by parsing again | Writes through the vault, reaction to changes from outside |
| [Validation](../features/validation.md) | Unfilled values, predefined checkers, issues | Order of checks, port for the schema validator | JSON Schema validator | Display of issues |
| [Custom checkers](../features/custom-checkers.md) | — | Port for the checker runner | Python process and its message protocol | Interpreter and modules in the settings tab |
| [Schema editor](../features/schema-editor.md) | — | Meta-schema of the schema dialect | — | Preview panel, command *Create schema* |
