---
tags:
  - requirements
index: "[ekphrasis documentation](docs/_index.md)"
aliases:
  - Requirements
---
# Requirements

The requirements of ekphrasis are the properties needed from the plugin by a project that stores rich content in YAML notes. Each YAML note of such a project serves [two readers](overview.md): a person reads the content of the values, and a program reads the data. To justify a design choice, feature notes and decision records cite a requirement by its block anchor.

## Readability

- **Structural presentation**: nested mappings and sequences must display as sections, lists and tables, in place of indented source text. ^structural-presentation
- **Rich content**: string values must render as Obsidian Markdown, including its block constructs (e.g. callouts, lists, tables) and LaTeX formulas in inline and display form. ^rich-content
- **Correspondence tables**: a correspondence between the terms of several vocabularies must render as a table, with one row for each tuple of related terms. ^correspondence-tables

## Navigation

- **Atomic references**: each key must be addressable from any note, from any other YAML note, and from a program that reads the data. ^atomic-references
- **Markdown links**: values must accept Markdown links as well as wikilinks, resolved as in a note of the same folder. ^markdown-links
- **Vault indexing**: YAML notes must take part in the search, the backlinks and the link graph of the vault. ^vault-indexing

## Integrity

- **Single source**: the YAML text must remain the only source, so the plugin must never rewrite it. Therefore, every construct of the source stays unchanged in the file (e.g. comments, YAML anchors, scalar styles). ^single-source
- **Machine readability**: every construct required by the plugin must leave the data unchanged for a standard YAML parser. ^machine-readability

## Authoring

- **In-place editing**: YAML notes must be editable within Obsidian, with YAML syntax highlighting. ^in-place-editing
- **Customizable presentation**: the presentation of each key must be configurable without modifying the data, and reusable across YAML notes. ^customizable-presentation
