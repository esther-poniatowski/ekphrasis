# ekphrasis

[![Maintenance](https://img.shields.io/maintenance/yes/2026)]()
[![Last Commit](https://img.shields.io/github/last-commit/esther-poniatowski/ekphrasis)](https://github.com/esther-poniatowski/ekphrasis/commits/main)
[![Obsidian](https://img.shields.io/badge/obsidian-%E2%89%A51.5.0-7c3aed)](https://obsidian.md/)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue)](https://www.typescriptlang.org/)
[![License: GPL](https://img.shields.io/badge/License-GPL--3.0-yellow.svg)](https://opensource.org/licenses/GPL-3.0)

Ekphrasis fills YAML records in Obsidian through forms generated from their JSON Schemas, and saves each edit into the YAML file.

---

## Overview

Projects usually record their specifications in YAML files, so that programs can check them. Each file is an instance of a record type, with fields, admitted values and rules. Authors typically fill these files from templates, whose comments hold the guidance. Scripts then check the rules once the file is written.

Ekphrasis displays each YAML file as a form built from the schema of its record type. Each field is filled through a control suited to its kind, its instructions display on demand, and its issues display as soon as it is edited. The YAML file remains the only source: each edit changes only the edited value, so programs keep reading an ordinary YAML file.

The motivation and the approach of the plugin are developed in the [project overview](docs/overview.md). The needs left unmet by other plugins are assessed in the [review of existing plugins](docs/references/_index.md).

---

## Features

- [ ] **Form initialization**: a command creates a new YAML file from a schema, with default values filled and required choices left unfilled, as specified for [instance creation](docs/features/instance-creation.md).
- [ ] **Form view**: each field is filled in place, with its instructions and examples on demand and collapsible groups, in the [form view](docs/features/form-view.md).
- [ ] **Field kinds**: labels, choices, Markdown lines and paragraphs, LaTeX formulas, lists and tables each receive a control of their own, listed under [field kinds](docs/features/field-kinds.md).
- [ ] **Outline**: a side panel displays the structure of the instance, moves the form to any field, and marks the fields with issues, in the [outline](docs/features/outline.md).
- [ ] **Validation**: rules declared in the schema check each field, the whole instance, relations between fields and conditions on other fields, as specified for [validation](docs/features/validation.md).
- [ ] **Custom checkers**: rules implemented in Python are registered in the plugin and invoked from schemas, as [custom checkers](docs/features/custom-checkers.md).
- [ ] **Progressive saving**: each edit is saved without a submission step, and changes only the edited value, as specified for [saving](docs/features/saving.md).
- [ ] **Schema editor**: schemas and their versions are created and modified through a form, in the [schema editor](docs/features/schema-editor.md).

A feature is checked once every step labelled with that feature is checked in the [roadmap](TODO.md).

---

## Quick start

To fill a record, the record type is declared by a schema, and the new record is created by a command. The syntax below belongs to features still open in the [roadmap](TODO.md).

The schema `schemas/term.schema.yaml` declares a glossary term with three required fields:

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: term.schema.yaml
title: Glossary term
type: object
required: [id, label, gloss]
properties:
  id:
    type: string
    x-kind: label
    description: Identifier of the term, in kebab case.
    pattern: '^[a-z0-9]+(-[a-z0-9]+)*$'
  label:
    type: string
    description: Preferred form of the term.
  gloss:
    type: string
    x-kind: markdown-line
    description: Definition of the term, in one sentence.
    x-rules:
      - check: word-count
        max: 30
```

For the new file `glossary/entropy.yaml`, the command *Create instance* writes the skeleton below, bound to the schema by its first line, and opens it as a form:

```yaml
# yaml-language-server: $schema=../schemas/term.schema.yaml
id:
label:
gloss:
```

The three fields are reported as missing until they are filled. Once filled, the field `gloss` is reported as invalid whenever it exceeds thirty words.

---

## Documentation

| Topic | Purpose |
| --- | --- |
| [Installation](docs/guide/installation.md) | To install the plugin in a vault |
| [Filling a form](docs/guide/filling-forms.md) | To create a record from a schema and fill its fields |
| [Writing a schema](docs/guide/writing-schemas.md) | To declare a record type with its instructions and rules |
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

For academic use, the GitHub feature "Cite this repository" generates citations in several formats, such as APA and BibTeX, from the [citation metadata](CITATION.cff).

### Third-party dependencies

- **[Obsidian API](https://github.com/obsidianmd/obsidian-api)**: interface between the plugin and Obsidian.
- **[yaml](https://eemeli.org/yaml/)**: YAML parser that preserves comments, scalar styles and source ranges.

---

## License

This project is licensed under the terms of the [GNU General Public License v3.0](LICENSE).
