---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Anchor declaration
status: superseded
---
# Anchor declaration

> [!QUESTION] Goal: how does a YAML note declare the stable label of a key?

The [requirement on atomic references](../requirements.md#^atomic-references) was first read as a call for a label per key. The place where the label is written determines the cost of the label to the data and to the author. The decision on [key-path references](key-path-references.md) supersedes this record, so no YAML note declares labels any longer.

## Decision

A label is declared by a trailing YAML comment on the line of the key. The last token of that comment is a caret followed by the label.

## Constraints

- **Machine readability**: the declaration must leave the data unchanged for a standard YAML parser.
- **Stability**: a label must stay valid when its key is renamed, reordered or moved.
- **Syntax parity**: a reference must take the form of a block reference of Obsidian, already familiar to authors.
- **Authoring cost**: a declaration must not require a structure parallel to the data.

## Options weighed

| Option | Benefit | Cost |
| --- | --- | --- |
| Trailing comment ending with a caret and the label | The data is unchanged, the label is independent of the path, and the caret matches the syntax of Obsidian | The parser must associate each comment with the line of its key |
| YAML anchor, written with an ampersand | Every YAML parser preserves it | A YAML anchor marks a node for reuse by aliases, so each label would also become a target of aliases. The anchor also attaches to the value instead of the key |
| Implicit path of the key, such as `model.objective` | No declaration is needed | Every rename or move of a key breaks the references to it |
| Dedicated key in the data, such as `id` | Programs can read the label | The data changes, and a scalar value cannot carry a key |

## Consequences

- The comment fields of the `yaml` library attach a comment to a neighbouring node. That node is not always the node of the same line, so the parser adapter associates each comment with its line through the source ranges.
- A program that consumes the data cannot resolve a label, since comments are invisible to that program. A reference to be followed by a program belongs in the data, as a value.
- A formatter that preserves comments also preserves the labels.
