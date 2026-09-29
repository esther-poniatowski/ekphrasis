---
tags:
  - guide
index: "[User guide](docs/guide/_index.md)"
aliases:
  - Authoring rich content in YAML
---
# Authoring rich content in YAML

Ekphrasis must already be installed in the vault, following the [installation steps](installation.md).

Markdown, LaTeX and links use characters reserved by the YAML syntax, so a value holding rich content must take a scalar style that preserves these characters.

## Reserved constructions

The reserved characters cause seven constructions of rich content to be misread in a plain scalar, written without quotes:

- an opening bracket starts a flow sequence, so that the value `[[note]]` parses as a nested list and the value `[text](note.md)` fails to parse;
- an opening brace starts a flow mapping;
- a hash sign at the start of the value or after a space starts a comment and truncates the value, as in an Obsidian tag;
- a colon followed by a space separates a key from its value, and fails to parse inside a plain scalar;
- an opening asterisk, ampersand or exclamation mark introduces an alias, a YAML anchor or a tag, so that a value opening with Markdown emphasis fails to parse;
- an opening vertical bar or greater-than sign introduces a block scalar, so that a value opening with a callout changes meaning;
- an opening backtick or at sign is reserved by YAML for future use.

^reserved-constructions

## Scalar styles

To preserve these constructions, the author chooses the scalar style of each value from the content of that value:

| Content of the value | Scalar style | Reason |
| --- | --- | --- |
| Prose over several lines, or content with a list, a callout or a display formula | Literal block scalar, introduced by a vertical bar | The style keeps every character and every line break. |
| Short text containing a backslash, as in most formulas | Single-quoted scalar | The style keeps the backslash as a character. A single quote inside the value must be doubled. |
| Short text containing a [reserved construction](#^reserved-constructions) | Single-quoted or double-quoted scalar | Quotes prevent the construction from being read as YAML syntax. |
| Short text without reserved construction | Plain scalar | The value needs no quotes. |

The values below hold a link, a formula, an emphasis and a callout in styles that preserve these constructions:

```yaml
source: '[[notes/variational-inference]]'
objective: '\mathcal{L}(\theta, \phi; x)'
qualifier: '*Approximate* posterior'
remark: |
  > [!note]
  > The encoder parameterizes $q_\phi(z \mid x)$.
```

One limitation concerns double quotes. A double-quoted scalar interprets the backslash as the start of an escape sequence. Therefore, the value `"\frac{a}{b}"` becomes a form feed followed by the text `rac{a}{b}`. Consequently, a formula in double quotes remains correct only with every backslash doubled.

## Formulas

The delimiters of a formula depend on how its value is displayed. When a value is displayed as Markdown, its formulas take the [delimiters of Markdown](../features/default-presentation.md#^formula-delimiters). When a value is displayed with the strategy `math` of a [view specification](../features/view-specifications.md), the value holds the formula without delimiters, since the strategy adds the delimiters. A formula displayed in a correspondence table is subject to the [restrictions on cell content](../features/correspondence-tables.md#^cell-content).
