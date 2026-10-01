---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Schema binding
status: accepted
---
# Schema binding

> [!QUESTION] Goal: how does ekphrasis find the schema of an instance?

The form, the skeleton and the checks all derive from the schema, so an instance must resolve to its schema before it opens as a form. The projects served follow different conventions: one project binds files to schemas by path patterns, and another identifies each record type by a key of the data.

## Decision

A modeline comment in the file names its schema, and the path rules of the settings bind the files without a modeline, in the order fixed by the [sources of a binding](../features/instance-files.md#^binding-sources).

## Constraints

- **Unchanged data**: the binding must leave the data read by programs unchanged.
- **Portable files**: an instance must be able to carry its binding, so that a moved file keeps its schema.
- **Existing layouts**: a project whose folder layout already determines the record type must not have to edit its files.
- **Interoperability**: the binding should be readable by YAML tools outside Obsidian.

## Options weighed

| Option | Benefit | Cost |
| --- | --- | --- |
| Modeline comment `# yaml-language-server: $schema=<path>` | The data stays unchanged, the file carries its binding, and the YAML language server reads the same line | A tool that rewrites the file without its comments drops the binding |
| Key of the data naming the schema, such as `$schema` | Programs read the binding | Every record carries a key foreign to its type, and each schema forbidding additional properties must admit that key |
| Key of the data naming the record type, such as `type` | Many records already carry such a key | The name of the key and its values differ between projects, so each project needs a mapping in the settings |
| Path rules in the settings | The files carry no line for the binding | A file moved to another folder loses its schema, and the binding is stored outside the project |
| Modeline, and else path rules | A file can carry its binding, a folder can bind its files without editing them, and a file can override the rule of its folder | Two sources of binding must be kept consistent |

## Consequences

- The modeline takes precedence, so a single file can depart from the schema of its folder.
- The command *Create instance* writes a modeline only when no path rule binds the new path.
- No key of the data selects a schema, so the data of an instance never names its schema.
