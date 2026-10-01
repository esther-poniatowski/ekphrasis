---
tags:
  - overview
index: "[ekphrasis documentation](docs/_index.md)"
aliases:
  - Project overview
---
# Project overview

Ekphrasis is an Obsidian plugin that fills YAML records through forms, each form generated from the JSON Schema of its record type.

## Motivation

Research and design projects commonly record their specifications in YAML files, so that programs can check and process them. Each file is an instance of a record type. The record type fixes the fields, their admitted values and the rules relating them. A person writes the file, typically by copying a blank template into a text editor.

Three limitations are commonly observed in this workflow. First, the guidance for each field is written in the comments of the template, where the author must find it among the data. Second, the author must master the YAML syntax of each value: inside double quotes, for instance, the backslash of a formula starts an escape sequence. Third, the rules of the record type are checked by scripts run after writing, so an error is reported away from the field that caused it.

The form plugins assessed for Obsidian act on notes, either on their frontmatter or on their body. According to the assessments of [form plugins](references/existing-plugins-forms.md) and of [YAML plugins](references/existing-plugins-yaml.md), none of the plugins assessed fills a standalone YAML file against a schema.

## Approach

Ekphrasis addresses these limitations under four design commitments.

First, one schema declares each record type. A [schema](features/schemas.md) states the fields, their kinds, their default values, their instructions and their validity rules, in JSON Schema extended by keywords of ekphrasis. The form, the skeleton of a new instance and the checks all derive from this declaration.

Second, the YAML file remains the only source of the data. The form view edits the file in place and [changes only the edited value](features/saving.md), so comments, key order and scalar styles stay unchanged. Therefore, programs keep reading an ordinary YAML file.

Third, every edit is saved without a submission step, as soon as the author leaves the field, pauses in typing or changes a choice. An incomplete or invalid instance is saved as well, so a record can be filled over several sessions.

Fourth, issues are reported at the field. The [rules](features/validation.md) declared in the schema run after each saved edit, and each missing or invalid field is highlighted in the form and in the outline of the instance. A rule beyond the predefined checkers can be implemented in Python and registered in the plugin.

## Scope

The scope of the plugin has four limits:

- Instances are standalone files with the extension `.yaml` or `.yml`. The frontmatter of notes stays with the Properties panel of Obsidian.
- Obsidian indexes no link written inside an instance, since it indexes links for notes only.
- Custom checkers run on desktop only, since the mobile application of Obsidian cannot start a Python process.
- Until the [schema editor](features/schema-editor.md) is implemented, schemas are written as files, following the [guide on writing schemas](guide/writing-schemas.md).
