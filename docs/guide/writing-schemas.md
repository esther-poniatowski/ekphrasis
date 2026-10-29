---
tags:
  - guide
index: "[User guide](docs/guide/_index.md)"
aliases:
  - Writing a schema
---
# Writing a schema

Ekphrasis must already be installed in the vault, following the [installation steps](installation.md). Until the [schema editor](../features/schema-editor.md) is available, a schema is written as a file in JSON or in YAML. The guide builds the schema of a notation entry, with one field of each common kind.

## Declaring the fields

To declare a record type, the author writes a schema that lists the fields of its records. The file `schemas/notation.schema.yaml` below declares a notation entry with four fields, two of them required:

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: notation.schema.yaml
title: Notation entry
type: object
required: [symbol, meaning]
properties:
  symbol:
    type: string
    x-kind: latex
  meaning:
    type: string
    x-kind: markdown-line
  kind:
    enum: [scalar, vector, matrix, operator]
    default: scalar
  remarks:
    type: string
    x-kind: markdown
```

The kind of each field selects its control, as listed under [field kinds](../features/field-kinds.md). The field `kind` needs no keyword `x-kind`, since its admitted values already make it a dropdown.

## Binding the records

To open records as forms, the author selects one of three binding routes:

- a top-level `_schema` field resolved through the schema registry configured in Ekphrasis;
- a path rule in the settings of the plugin, such as the pattern `notation/*.yaml` assigned to the schema `schemas/notation.schema.yaml`;
- a modeline at the top of each record, `# yaml-language-server: $schema=../schemas/notation.schema.yaml`, written by the command *Create instance* when no path rule binds the new file.

For the first route, the concrete schema requires `_schema` and fixes its logical identifier:

```yaml
required: [_schema, symbol, meaning]
properties:
  _schema: {const: 'example:notation@1'}
```

The registry maps that identifier to `schemas/notation.schema.yaml`. The [binding sources](../features/instance-files.md#^binding-sources) apply the three routes in their declared order.

## Guiding the author

To guide the author of each record, the schema gives each field a label, instructions and examples. The declaration below completes the field `meaning`:

```yaml
  meaning:
    type: string
    x-kind: markdown-line
    title: Meaning
    description: One sentence naming the quantity that the symbol denotes, in lowercase and without a final period.
    examples:
      - learning rate of the gradient descent
```

The effect of each of these keywords in the form is listed under [schemas](../features/schemas.md#^field-keywords).

## Declaring rules

To catch errors at the field, the schema declares validity rules, either with standard keywords or under the keyword `x-rules`. The declaration below limits the meaning to one sentence of at most twelve words:

```yaml
  meaning:
    type: string
    x-kind: markdown-line
    x-rules:
      - check: sentence-count
        max: 1
      - check: word-count
        max: 12
```

The predefined checkers, the rules relating several fields, and the conditional rules are listed under [validation](../features/validation.md). A rule beyond these checkers is written in Python and registered in the settings, following the contract of [custom checkers](../features/custom-checkers.md).
