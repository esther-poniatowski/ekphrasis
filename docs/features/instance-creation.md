---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Instance creation
---
# Instance creation

A command creates a new instance from its schema, as the [requirement on guided creation](../requirements.md#^guided-creation) demands. The command writes a skeleton of the record into a new YAML file, and opens that file in the [form view](form-view.md).

## Commands

Two kinds of command create an instance:

- the command *Create instance* asks for a schema, then for the path of the new file;
- a schema declared in the settings with a command name receives a command of its own, and that command asks for the path only.

The schemas offered are those named by the path rules of the settings, and those stored in the schema folder of the settings. The path proposed for the new file lies in the folder of the active file.

## Skeleton

The skeleton holds three elements:

- a modeline that binds the file to its schema, unless a path rule of the settings already binds the chosen path;
- every field with a default value, holding that value;
- every required field without a default value, holding the first [unfilled value](schemas.md#^unfilled-values) of the schema, or else the null value.

Optional fields without a default value stay absent from the file, although the form displays them. The first edit of such a field writes its key. In the file, the keys follow the order of the schema, so the file reads in the order of the form. The schema below, stored in the file `schemas/question.schema.yaml`, declares three required fields and one optional field, and gives a default value to one required field:

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: question.schema.yaml
title: Research question
type: object
required: [id, status, statement]
x-unfilled: [open]
properties:
  id:
    type: string
    x-kind: label
  status:
    enum: [posed, refined, answered, abandoned]
    default: posed
  statement:
    type: string
    x-kind: markdown-line
  notes:
    type: string
    x-kind: markdown
```

For a new file `questions/intermittency.yaml`, bound by no path rule, the command writes the skeleton below. The fields `id` and `statement` hold the unfilled value `open`, so the form reports them as missing until they are filled:

```yaml
# yaml-language-server: $schema=../schemas/question.schema.yaml
id: open
status: posed
statement: open
```
