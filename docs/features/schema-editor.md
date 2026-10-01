---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Schema editor
---
# Schema editor

The schema editor creates and modifies schemas through a form, as the [requirement on a schema editor](../requirements.md#^schema-editor) demands. Its implementation steps follow those of the form view in the [roadmap](../../TODO.md).

## Editing

The schema editor is the form view applied to a schema file, bound to the meta-schema shipped by ekphrasis for its [schema dialect](schemas.md). Therefore, a schema is filled like any instance: each field of the record type is an item holding its key, its [kind](field-kinds.md), its instructions, its examples, its default value and its [rules](validation.md). The outline, the instructions on demand and the checks of the form view serve the author of the schema as well. A preview panel displays the form generated from the schema under edit, and updates at each commit.

The command *Create schema* asks for a title and a path, and writes a schema holding the keywords `$schema`, `$id`, `title` and `x-version`.

## Versions

Each schema carries its version under the keyword `x-version`. Successive versions must remain available, so that each instance stays checkable against the version for which it was written, as the [requirement on schema versions](../requirements.md#^schema-versions) demands. The mechanism by which an instance names the version of its schema remains an open decision of the [roadmap](../../TODO.md). ^schema-version
