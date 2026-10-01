---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Saving
---
# Saving

Ekphrasis saves every edit of the form into the YAML file, without a submission step, as the [requirement on progressive saving](../requirements.md#^progressive-saving) demands. Validation never blocks saving, so an invalid value is saved as typed. Therefore, an instance can be filled over several sessions, and may remain incomplete or invalid between them.

## Commits

A control commits its value when it loses the focus, and when typing pauses for the delay set in the settings. A dropdown, a toggle and a checkbox commit at each change. Each commit writes the file through the vault of Obsidian, so other plugins and synchronization services observe each commit as an ordinary change of the file.

## Preserved text

A commit changes only the text of the edited value, as the [requirement on source preservation](../requirements.md#^source-preservation) demands. Every other character of the file stays identical, in particular:

- the comments, including a comment on the line of the edited value;
- the order of the keys;
- the scalar style and the quoting of the other values;
- the blank lines and the indentation.

The new text is spliced into the source range of the edited node, as the decision on [source-preserving writes](../adr/source-preserving-writes.md) records. A field written by its first edit is inserted after the preceding field in the order of the schema, with the indentation of its siblings.

## Scalar styles

An edited value keeps its scalar style whenever that style can represent the new value. Otherwise, and for a value written for the first time, ekphrasis selects the style from the content of the value:

| Content of the value | Scalar style |
| --- | --- |
| At least one line break | Literal block scalar, introduced by a vertical bar |
| A backslash, as in most formulas | Single-quoted scalar |
| Text that a YAML parser reads back unchanged when written plain | Plain scalar |
| Any other text, such as a value holding a [reserved construction](#^reserved-constructions) or read as a number, a boolean or the null value | Single-quoted scalar |

A single-quoted scalar keeps each backslash as a character, whereas a double-quoted scalar reads a backslash as the start of an escape sequence. Inside a single-quoted scalar, each single quote of the value is doubled.

Rich content frequently holds seven constructions misread in a plain scalar, since the YAML syntax reserves their characters:

- an opening bracket or brace starts a flow collection;
- a hash sign at the start of the value or after a space starts a comment;
- a colon followed by a space separates a key from its value;
- an opening asterisk, ampersand or exclamation mark introduces an alias, an anchor or a tag;
- an opening vertical bar or greater-than sign introduces a block scalar;
- an opening quote character starts a quoted scalar;
- an opening backtick or at sign is reserved for future use.

^reserved-constructions

## Cleared values

Clearing the value of an optional field removes its key from the file. Clearing the value of a required field writes the first [unfilled value](schemas.md#^unfilled-values) of the schema, or else the null value, written as an empty value after the key. Therefore, the file keeps a key for every required field, and a program finds each missing value at its expected place.

## Changes from outside

When the file changes outside the form view, for instance through the source view, a git checkout or another editor, the form view parses the file again and displays the new values. The focused control keeps its uncommitted text, and commits it to the same field path in the new text. While the text fails to parse, the form view suspends every commit.
