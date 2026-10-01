---
tags:
  - index
index: "[ekphrasis documentation](docs/_index.md)"
aliases:
  - Features
---
# Features

Each feature of ekphrasis is specified in one note, by the syntax accepted in a schema or an instance and by the behaviour of the plugin. Each note states the target behaviour of its feature, whereas the steps already implemented are checked in the [roadmap](../../TODO.md). The notes are listed in dependency order.

- [YAML instances](instance-files.md): to store a record in a YAML file, and to bind that file to its schema.
- [Schemas](schemas.md): to declare the fields of a record type, their defaults, their instructions and their required or conditional status.
- [Field kinds](field-kinds.md): to choose the control through which each field is filled.
- [Field paths](field-paths.md): to designate a field of an instance in a rule, in an issue or in a checker.
- [Instance creation](instance-creation.md): to create a new instance from a schema, and to predict the skeleton written into the file.
- [Form view](form-view.md): to fill an instance, display the instructions of a field, and switch to the YAML text.
- [Outline](outline.md): to navigate a long instance, and to find the fields that remain missing or invalid.
- [Saving](saving.md): to predict how each edit changes the YAML file, and which parts of the file stay unchanged.
- [Validation](validation.md): to declare validity rules in a schema, and to interpret the issues reported.
- [Custom checkers](custom-checkers.md): to implement a rule in Python, register it, and invoke it from a schema.
- [Schema editor](schema-editor.md): to create and modify schemas through a form, and to manage their versions.
