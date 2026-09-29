# ekphrasis

[![Maintenance](https://img.shields.io/maintenance/yes/2026)]()
[![Last Commit](https://img.shields.io/github/last-commit/esther-poniatowski/ekphrasis)](https://github.com/esther-poniatowski/ekphrasis/commits/main)
[![Obsidian](https://img.shields.io/badge/obsidian-%E2%89%A51.5.0-7c3aed)](https://obsidian.md/)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue)](https://www.typescriptlang.org/)
[![License: GPL](https://img.shields.io/badge/License-GPL--3.0-yellow.svg)](https://opensource.org/licenses/GPL-3.0)

Ekphrasis renders YAML notes in Obsidian as readable documents: string values display as Markdown and LaTeX.

---

## Overview

Design projects typically store their specifications in YAML files, so that programs can read them. Beside typed parameters, the values of these files hold prose, formulas and cross-references. Collaborators and reviewers must read this content, but raw YAML leaves it as source text: formulas appear as TeX commands, and links as bracketed paths.

Ekphrasis renders this content in Obsidian, while the YAML text remains the only source. Therefore, programs keep reading the same data. The data is stored in YAML notes, whose name ends with the suffix `.yaml.md`, so that Obsidian indexes their links as for any note.

The motivation and the approach of the plugin are developed in the [project overview](docs/overview.md). The needs left unmet by other plugins are assessed in the [comparison of existing plugins](docs/existing-plugins.md).

---

## Features

- [ ] **Rich content**: string values render as Markdown, including callouts, tables and LaTeX formulas, before any configuration, under the [default presentation](docs/features/default-presentation.md).
- [ ] **View specifications**: the display of each key is customized once for a whole family of YAML notes, in a [view specification](docs/features/view-specifications.md).
- [ ] **Correspondence tables**: correspondences between vocabularies render as [correspondence tables](docs/features/correspondence-tables.md).
- [ ] **Key references**: any key of a YAML note can be linked by its path, from a note as well as from a program, as a [key reference](docs/features/references.md).
- [ ] **Links**: [wikilinks and Markdown links](docs/features/links.md) inside values resolve as in a note.
- [ ] **Embedding**: a YAML note, or a single key of that note, can be displayed inside another note as an [embedding](docs/features/embedding.md).
- [ ] **Editing**: a YAML note can be edited in the Markdown editor of Obsidian, with YAML syntax highlighting, in the [editing mode](docs/features/editing.md).

A feature is checked once every step of that feature is checked in the [roadmap](TODO.md).

---

## Quick start

To display one key of a model in another note, the model is stored in a YAML note, and the key is designated by its path. The syntax below belongs to features still open in the [roadmap](TODO.md).

A YAML note holds its data in its body, below the frontmatter. The note `specs/model.yaml.md` declares a model:

```markdown
---
view: "[[views/model.view.yaml]]"
---
model:
  name: "Variational autoencoder"
  objective: |
    The encoder and the decoder maximize the evidence lower bound $\mathcal{L}(\theta, \phi; x)$.
```

Another note designates the objective of the model by its path from the root of the body, `model.objective`. The link `[[specs/model.yaml#model.objective]]` opens the objective in the reading mode. A code block of language `yaml-view` displays the objective inside that other note:

````markdown
```yaml-view
src: specs/model.yaml.md
path: model.objective
```
````

---

## Documentation

| Topic | Purpose |
| --- | --- |
| [Installation](docs/guide/installation.md) | To install the plugin in a vault |
| [Authoring rich content in YAML](docs/guide/authoring-yaml.md) | To write values that preserve Markdown, formulas and links |
| [Features](docs/features/_index.md) | To know the syntax and the behaviour of each feature |
| [Architecture](docs/architecture/_index.md) | To locate the module responsible for a behaviour |
| [Architecture decisions](docs/adr/_index.md) | To know which constraint fixed each design choice |

Every note of the documentation is registered in the [documentation index](docs/_index.md).

---

## Contributing

The development setup and the commit conventions are described in the [contribution guidelines](CONTRIBUTING.md).

---

## Acknowledgments

### Authors

**Author**: @esther-poniatowski

For academic use, the GitHub feature "Cite this repository" generates citations in various formats, from the [citation metadata](CITATION.cff).

### Third-party dependencies

- **[Obsidian API](https://github.com/obsidianmd/obsidian-api)**: interface between the plugin and Obsidian.
- **[yaml](https://eemeli.org/yaml/)**: YAML parser that preserves comments, scalar styles and source ranges.

---

## License

This project is licensed under the terms of the [GNU General Public License v3.0](LICENSE).
