---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Source-preserving writes
status: proposed
---
# Source-preserving writes

> [!QUESTION] Goal: how does a commit of the form reach the YAML text?

The form edits parsed values, whereas the file holds text whose comments and scalar styles carry information of their own. Therefore, the parts of the file altered by a commit depend on how a committed value is converted back into text.

## Decision

Each commit replaces the text at the source range of the edited node by the new text of that node, and leaves every other character unchanged, as the specification of [saving](../features/saving.md) details.

## Constraints

- **Source preservation**: the [requirement on source preservation](../requirements.md#^source-preservation) calls for a file whose text changes only at the edited value.
- **Machine readability**: the new text must parse to the committed value.
- **Structural edits**: a commit must also be able to add a key, an item or a row.

## Options weighed

| Option | Benefit | Cost |
| --- | --- | --- |
| Serialize the whole document again from a model that keeps the comments | One serializer handles every edit | The serializer applies its own line width, indentation and flow styles to the untouched nodes, so the file changes beyond the edited value |
| Serialize the edited node, and splice its text into the source range of that node | Every untouched character stays identical | Ekphrasis must compute the scalar style of each value and the indentation of each inserted node |
| Edit the concrete syntax tree of the YAML library | The library keeps every token, and replaces a scalar in place | Insertions of keys and items must be assembled token by token, with the same computations as the splice |

## Consequences

- The parser must report the source range of each node, including the ranges of block scalars and of flow collections.
- After each splice, ekphrasis parses the new text and compares the parsed value with the committed value. When the two differ, the commit is not written, and an error is reported at the field.
- Ekphrasis selects scalar styles in the domain layer, so unit tests check the selected styles without Obsidian.
