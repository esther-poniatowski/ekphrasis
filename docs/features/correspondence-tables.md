---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Correspondence tables
---
# Correspondence tables

Ekphrasis displays a correspondence between vocabularies as a correspondence table, with one row for each tuple of related terms. Such a correspondence relates the terms of two or more vocabularies term by term. For example, a notation related to its meaning and its unit forms a correspondence, as do the concepts of two theories related pairwise. The table display satisfies the [requirement on correspondence tables](../requirements.md#^correspondence-tables).

## Forms

To encode a correspondence, the data takes one of three ordinary YAML forms. The forms differ by the element that identifies a row:

- **Records**: a sequence of mappings sharing the same keys, in which each mapping forms a row and each key forms a column. Records relate any number of vocabularies.
- **Keyed records**: a mapping of mappings, in which each outer key heads a row and each inner key forms a column.
- **Pairs**: a mapping of scalars, in which each key and its value form a row of two columns.

The body below encodes one correspondence in each form:

```yaml
notation:  # records
  - symbol: '$z$'
    meaning: "Latent variable"
    unit: "none"
  - symbol: '$\beta$'
    meaning: "Weight of the divergence term"
    unit: "none"
theories:  # keyed records
  predictive-coding:
    signal: "Prediction error"
    update: "Gradient step on the free energy"
  reinforcement-learning:
    signal: "Reward prediction error"
    update: "Temporal-difference step"
glossary:  # pairs
  encoder: "Network mapping an observation to a distribution over latent variables."
  decoder: "Network mapping a latent sample to a distribution over observations."
```

## Declaration

Records need no declaration: the [default presentation](default-presentation.md) renders them as a table whenever their mappings hold scalars only. Keyed records and pairs require a rule with the strategy `table` in the [view specification](view-specifications.md). This rule is required because a mapping of mappings ordinarily forms sections, and a mapping of scalars ordinarily forms a list of fields. A rule may shape the table by the following presentation keys:

| Key | Values | Effect |
| --- | --- | --- |
| `columns` | sequence of column declarations | Columns displayed, in order |
| `row-key-label` | text | Header of the first column, the column holding the outer key of keyed records or the key of pairs |
| `value-label` | text | Header of the value column of pairs |

^table-keys

A column declaration takes three keys:

- the key `key` names the inner key displayed in the column;
- the optional key `label` sets the header of the column;
- the optional key `render` sets the strategy of the cells among `inline`, `math` and `code`.

Without the key `columns`, the table displays every inner key, in the order in which each key first appears, under a header equal to the key. The rule below displays the correspondence between theories under explicit headers:

```yaml
rules:
  - path: "theories"
    render: table
    row-key-label: "Theory"
    columns:
      - key: signal
        label: "Learning signal"
      - key: update
        label: "Update rule"
```

## Cell content

A Markdown table cell holds inline content only, so each cell renders its value as inline Markdown. For the same reason, block content such as a list or a display formula does not fit a cell. When a value requires block content, the value belongs in a key displayed outside the table. A vertical bar closes a cell in Markdown, so the plugin escapes every vertical bar of a value, including the bars of a formula. A line break inside a value becomes a line break of the cell. When a record lacks a declared key, the corresponding cell stays empty. ^cell-content

## References to rows

To link one row of a correspondence table, a [key reference](references.md) designates the row by the [key path](key-paths.md) of its record, of its outer key, or of its pair. For example, the paths `theories.predictive-coding` and `glossary.encoder` designate rows of the keyed records and of the pairs in the body encoding the three forms. A record is designated by position, as in the path `notation.0`, or by the value of an identifying key. Obsidian supports no [link to a part of a table](https://help.obsidian.md/links), so ekphrasis resolves these references itself, from the position of each row in the rendered table.
