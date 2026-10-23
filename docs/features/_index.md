---
tags:
  - index
index: "[ekphrasis documentation](docs/_index.md)"
aliases:
  - Features
---
# Features

Specifies each feature of ekphrasis by the syntax accepted in a schema or an instance and by the behaviour of the plugin

> [!IMPORTANT] Order of entries
> The notes are listed in dependency order.

- [YAML instances](instance-files.md): fixes how a record is stored in a YAML file and bound to its schema
- [Schemas](schemas.md): fixes how a schema declares a record type
- [Field kinds](field-kinds.md): matches each field with the control through which it is filled
- [Field paths](field-paths.md): fixes how a rule, an issue or a checker designates a field of an instance
- [Instance creation](instance-creation.md): predicts the new instance written from a schema
- [Form view](form-view.md): fixes how an instance is filled through its form
- [Outline](outline.md): fixes how an author moves through a long instance and finds its remaining issues
- [Links](links.md): fixes how a value or a note links to a field of an instance, and how the links of a value resolve
- [Metadata](metadata.md): fixes how the metadata of an instance displays apart from its form, with its aliases, its tags and its links
- [Tags](tags.md): fixes how the tags of instances join a tree of tags that a search browses
- [Images](images.md): fixes how a form displays the images embedded in its values or held by its fields
- [Saving](saving.md): predicts how each edit changes the YAML file, and which parts of the file stay unchanged
- [Validation](validation.md): fixes how a schema declares its validity rules, and how their issues are reported
- [Custom checkers](custom-checkers.md): fixes how a rule written in Python is registered and invoked from a schema
- [Schema editor](schema-editor.md): fixes how schemas and their versions are created and modified through a form
