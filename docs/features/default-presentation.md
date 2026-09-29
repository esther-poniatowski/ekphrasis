---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Default presentation
---
# Default presentation

The default presentation renders a YAML note legibly before any view specification exists, because it applies to every key covered by no [view specification](view-specifications.md). The display of each such key is derived from the structure and the scalar style of its value. Each type of value in the source receives one display:

| Value in the source | Display |
| --- | --- |
| Mapping | Section headed by the key, at the heading level equal to the depth of the key and capped at six |
| Literal block scalar `\|` or folded block scalar `>` | Key as a bold label, followed by the value rendered as Markdown blocks |
| Other scalar | Key as a bold label, followed by the value rendered as inline Markdown on the same line |
| Sequence of scalars, none of them in block style | Key as a bold label, followed by a bulleted list of the values |
| Sequence of mappings sharing the same keys and holding scalars only | [Correspondence table](correspondence-tables.md) with a column for each key |
| Other sequence | Labelled entry for each item, whose label joins the key and the position of the item, counted from 1 |
| Null value | Em dash |

A block scalar renders as Markdown blocks because authors typically reserve the block style for multi-line prose. A plain or quoted scalar displays inline, so that a short parameter stays on the line of its key.

A formula in either style renders when it carries the delimiters of Markdown: single dollar signs inline, and double dollar signs for display. ^formula-delimiters
