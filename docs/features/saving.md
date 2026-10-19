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

A control commits its value when it loses the focus, and when typing pauses for the *commit delay* of the settings, one second by default. A dropdown, a toggle and a checkbox commit at each change. The empty option of a dropdown clears its field. Each commit writes the file at once through the vault of Obsidian, so other plugins and synchronization services observe each commit as an ordinary change of the file. Text typed in a field of kind `number` is written as a number when it reads as a decimal number, and as typed otherwise, such as the placeholder `open`.

## Preserved text

A commit changes only the text of the edited value, as the [requirement on source preservation](../requirements.md#^source-preservation) demands. Every other character of the file stays identical, in particular:

- the comments, including a comment on the line of the edited value;
- the order of the keys;
- the scalar style and the quoting of the other values;
- the blank lines and the indentation.

The new text is spliced into the source range of the edited node, as the decision on [source-preserving writes](../adr/source-preserving-writes.md) records. A field written by its first edit is inserted after the preceding field in the order of the schema, with the indentation of its siblings. When no preceding field is present, the field is inserted before the following one. The absent groups that contain the field are inserted with the field, each indented by two spaces under its parent. When a field is written as a bare key, such as `restriction:`, its value is inserted after the colon, before any comment of that line. A block scalar written there keeps its header on the line of the key, and its lines start on the next line.

## Scalar styles

An edited value keeps its scalar style whenever that style can represent the new value. A field of a single-line kind (`label`, `text`, `markdown-line` or `latex`) never keeps a block style: its value is written in the style selected below, plain whenever the test for a plain scalar holds. A quoted style represents one line only, since the YAML writer folds each line break of a quoted scalar into a blank line. A number or a boolean is always written plain. Otherwise, and for a string written for the first time, ekphrasis selects the style from the content of the value:

| Content of the value | Scalar style |
| --- | --- |
| At least one line break | Literal block scalar, introduced by a vertical bar; inside a flow collection, double-quoted scalar |
| A backslash, as in most formulas | Single-quoted scalar |
| Text that parsers of YAML 1.2 and of YAML 1.1 both read back unchanged when written plain at the position of the value | Plain scalar |
| Any other text, such as a value holding a [reserved construction](#^reserved-constructions) or read as a number, a boolean or the null value | Single-quoted scalar |

The test for a plain scalar covers YAML 1.1, since PyYAML, a common YAML parser of the Python checkers, implements that version. YAML 1.1 also reads words such as `yes`, `no` and `on` as booleans, and a date as a timestamp. The test for a plain scalar applies at the position of the value. Inside a flow collection, written between brackets or braces, a plain scalar admits none of the characters `,`, `[`, `]`, `{` and `}`. Therefore, the value `a, b` is written plain in a block mapping, and single-quoted in a flow mapping.

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

Clearing the value of an optional field removes its key from the file. Each comment on the removed lines stays, on a line of its own at the indentation of the key. When the key is the only key of its mapping, the key stays with an empty value, since a block mapping holds at least one key. Clearing the value of a required field writes the first scalar among the [unfilled values](schemas.md#^unfilled-values) of the schema, or else the null value, written as an empty value after the key. Therefore, the file keeps a key for every required field, and a program finds each missing value at its expected place.

## Refused commits

A commit is written only once the new text is confirmed. The new text is parsed, and its document is compared with the expected document: the committed value at the edited field, and every other value unchanged. When the two documents differ, or when the new text fails to parse, the commit is refused. Two edits are also refused until the milestone *Collections* of the [implementation plan](../architecture/implementation-plan.md) implements them:

- adding or removing a key of a mapping written between braces;
- clearing an item of a sequence.

A refused commit leaves the file unchanged. Its reason is displayed below its field, and the control keeps the typed text until the value of the field changes.

## Changes from outside

When the file changes outside the form view, for instance through the source view, a git checkout or another editor, the form view parses the file again and displays the new values. The focused control keeps its uncommitted text, and commits it to the same field path in the new text. While the text fails to parse, the form view keeps displaying the last form that parsed, under a notice giving the position of the error. The commits made meanwhile wait, and apply in their order once the text parses again. Commits made while a new text loads wait in the same way. Therefore, no commit can apply to a text already replaced by a change from outside.
