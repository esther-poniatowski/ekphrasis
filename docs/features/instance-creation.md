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

The command _Create instance_ creates a record through the following sequence:

1. The schema chooser lists the writable contracts of the configured [schema registry](instance-files.md#^binding-sources). Each entry shows the schema title and its logical identifier. Schemas whose root declares `readOnly: true` are excluded.
2. The path prompt proposes a YAML file in the folder of the active file. The entered path must stay inside the vault, end in `.yaml` or `.yml`, and name no existing file.
3. The command writes the skeleton and opens the new file in the form view.
4. When a post-creation command is configured, Ekphrasis invokes it with the new path and schema
   identifier. The producer can then update related project files without placing its rules in
   Ekphrasis.

If the registry or a contract is invalid, the command shows a notice and writes no file. In particular, each offered contract must declare its registered logical identifier as the constant value of its `_schema` property.

The setting _Post-creation command_ accepts an array of strings. Ekphrasis sends those strings to the
configured Python interpreter without a shell. Three placeholders supply values that depend on the
new record:

- `{vault}` supplies the absolute vault root;
- `{path}` supplies the vault-relative path;
- `{schema}` supplies the logical schema identifier.

If the configured command fails, the created record remains in place and its form opens. The failure
notice names the cause and directs the researcher to _Retry failed post-creation action_. The retry
runs the configured command for the preserved record without writing the record again. If the retry
fails, the command remains available. If the retry succeeds, the command disappears. A plugin restart
also clears this session-scoped retry.

## Skeleton

The skeleton holds three elements:

^skeleton

- the field `_schema`, holding the logical identifier chosen from the registry;
- every field with a default value, holding that value;
- every required field without a default value, holding the first scalar among the [unfilled values](schemas.md#^unfilled-values) of the schema, or else the null value.

Only required fields and fields with defaults enter the skeleton. The form still displays every other declared field, and its first edit writes the key. The file and form use the property order of the schema. The registry maps the logical identifier `project:question@1` to this example schema. The schema requires four fields and gives a default value to one of them:

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: question.schema.yaml
title: Research question
type: object
required: [_schema, id, status, statement]
x-unfilled: [open]
properties:
  _schema:
    const: project:question@1
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

For the new file `questions/intermittency.yaml`, the command writes the following skeleton. Its fields `id` and `statement` hold the unfilled value `open`. Therefore, the form reports both fields as missing:

```yaml
_schema: project:question@1
id: open
status: posed
statement: open
```
