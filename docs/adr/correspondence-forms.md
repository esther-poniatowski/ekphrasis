---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Correspondence forms
status: proposed
---
# Correspondence forms

> [!QUESTION] Goal: which syntax encodes a correspondence between vocabularies, so that it renders as a table?

The [requirement on correspondence tables](../requirements.md#^correspondence-tables) fixes the display. That requirement does not fix the YAML form that encodes the correspondence in the data.

## Decision

A correspondence is encoded in one of three ordinary YAML forms: records, keyed records and pairs. The strategy `table` renders each form as a table, as the specification of [correspondence tables](../features/correspondence-tables.md) details.

## Constraints

- **Machine readability**: a program must read each cell with its YAML type, without a second parser.
- **Unchanged data**: the choice of a table display must leave the data unchanged.
- **Arity**: the forms must relate any number of vocabularies.
- **Robustness**: each cell must stay attached to its key when the columns are reordered.

## Options weighed

| Option | Benefit | Cost |
| --- | --- | --- |
| Markdown table written in a block scalar | The source displays as written | A program must parse Markdown to read a cell, and every cell loses its type |
| Header row followed by rows written as sequences | Compact source | Each cell is identified by its position, so when the columns are reordered, the cells silently attach to other headers |
| Delimited text, such as CSV, in a block scalar | Compact and familiar source | A second parser is needed, and every cell loses its type |
| Records, keyed records and pairs, with the strategy `table` | A program reads ordinary collections, each cell is identified by its key, and records relate any number of vocabularies | Keyed records and pairs require a rule in a view specification |

## Consequences

- The default presentation renders records as a table. Keyed records and pairs require a declaration, since the same collections ordinarily form sections and fields.
- The strategy `table` renders a Markdown table, so the [content of each cell](../features/correspondence-tables.md#^cell-content) must be inline. Therefore, a value with block content must stay outside the table.
- Obsidian supports no link to a part of a table, so ekphrasis resolves a key reference to a row from the position of the row.
