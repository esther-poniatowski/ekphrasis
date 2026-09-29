---
tags:
  - architecture
index: "[Architecture](docs/architecture/_index.md)"
aliases:
  - Layers and dependency rule
---
# Layers and dependency rule

Four layers divide the source code of ekphrasis, and each layer depends only on the layers closer to the domain. The domain layer depends on no library and on no host application. The projection into Markdown lies in the domain, so the projection runs outside Obsidian, as the testability constraint of the [Markdown projection](../adr/markdown-projection.md) requires. From the domain outward, the four layers are the following:

| Layer | Folder | Responsibility | Admitted dependencies |
| --- | --- | --- | --- |
| Domain | `src/domain/` | Tree of a YAML body, presentation specification of a node, projection into Markdown, renderers | None |
| Application | `src/application/` | Ports, chain of specification sources, use cases, model of the settings | Domain |
| Infrastructure | `src/infrastructure/` | Port implementations that call third-party libraries (e.g. the YAML parser) | Domain, application |
| Adapters | `src/adapters/` | Composition root, and every module that calls the API of Obsidian (e.g. views, commands, settings tab) | All layers |

The dependency rule is enforced by the ESLint configuration `config/tools/eslint.config.mjs`, so an import that breaks the rule fails the lint check. The same check forbids the API of Obsidian in every layer except the adapters, and the YAML parser in the domain and application layers. Any other library is excluded from the domain by convention only, since no lint rule forbids such a library.

Two files of the folder `src/` lie outside the four layer folders:

- the error hierarchy `src/errors.ts`, shared by all layers;
- the entry point `src/main.ts`, exporting only the plugin class.

## Features across layers

The code of each feature is divided according to whether it calls the API of Obsidian. The parts that call this API lie in the adapters layer, since no other layer admits this API, and the other parts lie in the inner layers. Some features have parts on one side only. Each feature is planned to split across the layers as follows:

| Feature | Domain | Application | Infrastructure | Adapters |
| --- | --- | --- | --- | --- |
| [YAML notes](../features/file-format.md) | — | — | Split of the frontmatter from the body | Reading mode in place of the Markdown view |
| [Key paths](../features/key-paths.md) | Parser of key paths, matching of paths and patterns against the tree | — | — | — |
| [Default presentation](../features/default-presentation.md) | Built-in renderers | Heuristic source of specifications | — | — |
| [View specifications](../features/view-specifications.md) | Specification of a node | Chain of specification sources, port for vault files | Parser of view specification notes | Vault access behind the port, folder rules in the settings tab |
| [Correspondence tables](../features/correspondence-tables.md) | Table renderer, escape of vertical bars in cells | — | — | — |
| [Key references](../features/references.md) | Rewrite of the key paths of a link after a rename | — | — | Scroll to the designated key, suggestions of key paths, rename command, report of broken references |
| [Links](../features/links.md) | — | — | — | Handler of followed links |
| [Embedding](../features/embedding.md) | — | — | — | Processor of the code block |
| [Reading and editing modes](../features/editing.md) | — | — | — | Editor extension, control that switches modes |
