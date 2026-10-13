---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Field kinds
---
# Field kinds

Each field is filled through the control of its kind, as the [requirement on typed controls](../requirements.md#^typed-controls) demands. The kind of a field is declared by the keyword `x-kind` of its schema, or else derived from the standard keywords of that schema. A declared kind overrides the derived one, for instance to display a sequence of mappings with many scalar keys as collapsible groups instead of a table.

## Scalar kinds

A scalar kind holds one value per field:

| Kind | Value in the YAML file | Control | Derived from |
| --- | --- | --- | --- |
| `label` | One word, without spaces | Single-line input | `x-kind` only |
| `text` | One line of plain text | Single-line input | `type: string` |
| `markdown-line` | One line of inline Markdown | Single-line input, with a rendered display | `x-kind` only |
| `markdown` | Paragraphs of Markdown | Multi-line input, with a rendered display | `x-kind` only |
| `latex` | LaTeX formula, without delimiters | Single-line input, with a display formula | `x-kind` only |
| `number` | Integer or decimal number | Single-line input with a decimal keyboard | `type: number` or `type: integer` |
| `boolean` | `true` or `false` | Toggle | `type: boolean` |
| `choice` | One of the admitted values | Dropdown | `enum`, or `oneOf` of `const` values |

Two kinds carry an implicit rule. The kind `label` admits one word only, and the kind `markdown-line` admits no line break. [Validation](validation.md) checks both rules like any declared rule. In a `oneOf` of `const` values, each value may carry a `title` and a `description`, and the dropdown displays both.

## Collection kinds

A collection kind holds several values, each filled through the control of its own kind:

| Kind | Value in the YAML file | Control | Derived from |
| --- | --- | --- | --- |
| `choices` | Sequence of admitted values, each at most once | Checkboxes | `type: array` with `items.enum` and `uniqueItems: true` |
| `list` | Sequence of scalars | List of inputs, with buttons to add, remove and reorder items | `type: array` with scalar `items` |
| `group` | Mapping with declared keys | Collapsible section, holding one field per key | `type: object` with `properties` |
| `table` | Sequence of mappings whose values are scalars | Table with one row per item and one column per key | `type: array` whose `items` declare scalar properties only |
| `keyed-table` | Mapping from identifiers to mappings whose values are scalars | Table whose first column holds the identifier | `type: object` whose `additionalProperties` or `patternProperties` declare scalar properties only |
| `records` | Sequence of mappings with nested values | Sequence of collapsible groups | `type: array` whose `items` declare a nested property |
| `keyed-records` | Mapping from identifiers to mappings with nested values | Sequence of collapsible groups, each headed by its identifier | `type: object` whose `additionalProperties` or `patternProperties` declare a nested property |
| `alternatives` | Value matching one of several subschemas | Selector of the alternative, followed by the fields of the selected alternative | `oneOf` of object schemas |

Each column of a table takes the scalar kind of its property, so a cell can hold a formula or a line of Markdown. A table grows by one row at a time, and each new row is saved like any other edit. An issue on a cell displays in that cell.
