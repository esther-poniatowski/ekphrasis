---
tags:
  - overview
index: "[ekphrasis documentation](docs/_index.md)"
aliases:
  - Project overview
---
# Project overview

Ekphrasis is an Obsidian plugin that displays the string values of YAML data as Markdown and LaTeX, so that people can read these values as documents.

## Motivation

Specifications of design projects are typically kept in YAML files. In these files, typed parameters are mixed with values written as prose, formulas and cross-references. Each such file serves two readers: a program reads the typed structure, whereas a developer, a collaborator or a reviewer reads the content of the values.

Two limitations affect the human reader. First, raw YAML serves the program only: prose appears as source text, formulas as TeX commands, and links as bracketed paths. Second, the four Obsidian plugins that process YAML content edit YAML or display frontmatter. According to their [assessment](existing-plugins.md), none of these plugins covers four requirements of ekphrasis:

- rich content;
- atomic references;
- Markdown links;
- customizable presentation.

## Approach

Ekphrasis addresses these limitations under three design commitments.

First, the data is stored in notes, so that the links written in values can reach the backlinks and the graph of the vault. Notes are required because Obsidian indexes links for notes only. This constraint fixes the [choice of notes as data containers](adr/yaml-note-container.md). A note that holds the data is a [YAML note](features/file-format.md): its name ends with the suffix `.yaml.md`, and its body holds YAML.

Second, the YAML text remains the only source. Ekphrasis projects each YAML note into a sequence of Markdown blocks, and the Markdown renderer of Obsidian renders each block. The display is recomputed at each change and never written back. Therefore, the data read by programs never changes through the plugin.

Third, the presentation stays apart from the data, so that one declaration serves every YAML note of a family. The presentation of each key is declared in a [view specification](features/view-specifications.md), itself a note.

## Scope

The scope of the plugin has two limits. First, files with the plain extension `.yaml` fall outside the scope, since Obsidian indexes no link of such a file. Second, ekphrasis does not validate a YAML note against a schema, and reports syntax errors only.
