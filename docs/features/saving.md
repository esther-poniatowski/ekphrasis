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

The new text is spliced into the source range of the edited node, as the decision on [source-preserving writes](../adr/source-preserving-writes.md) records. A field written by its first edit is inserted after the preceding field in the order of the schema, with the indentation of its siblings. When no preceding field is present, the field is inserted before the following one. The absent groups that contain the field are inserted with the field, each indented by two spaces under its parent. When a field is written as a bare key, such as `restriction:`, its value is inserted after the colon, before any comment of that line. A block scalar written there keeps its header on the line of the key, and its lines start on the next line. When the group of the field holds an unfilled value, as in `check: open`, that value is erased. The field is written below the key of the group, in place of that value.

## Scalar styles

An edited value keeps its scalar style whenever that style can represent the new value. A field of a single-line kind (`label`, `text`, `markdown-line` or `latex`) never keeps a block style. Its value is written in the style selected for a new string: plain, or single-quoted when the value holds a backslash or fails the test for a plain scalar. A quoted style represents one line only, since the YAML writer folds each line break of a quoted scalar into a blank line. A number or a boolean is always written plain. Otherwise, and for a string written for the first time, ekphrasis selects the style from the content of the value:

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

Clearing the value of an optional field removes its key from the file. Each comment on the removed lines stays, on a line of its own at the indentation of the key. When the key is the only key of its mapping, the key stays with an empty value, since a block mapping holds at least one key. Clearing the value of a required field writes the first scalar among the [unfilled values](schemas.md#^unfilled-values) of the schema, or else the null value, written as an empty value after the key. Therefore, the file keeps a key for every required field, and a program finds each missing value at its expected place. A cleared item of a sequence is treated as a cleared required field, so it stays at its position; its removal is a [structural edit](#^structural-edits). ^cleared-values

## Collections

An edit of a collection inserts, removes or moves one of its entries: an item of a sequence, or a key with its value in a mapping. Each edit keeps the form of its collection, as the user decided on 2026-10-20. A block collection receives lines with the indentation of its siblings, and a flow collection receives its entries with their separating commas. A flow collection never becomes a block collection, since that conversion would rewrite lines that the author did not edit. ^structural-edits

### New entries

A new item, row or entry is written by the first value committed inside it, as an absent optional field is. Before that commit, the form displays the entry as a draft, and the entry is absent from the file. After that commit, the entry holds the committed value only, with the absent keys and items between that value and the collection. Its position follows four rules:

- a new item ends its sequence;
- a new key of a declared property follows the order of the schema, as an absent field does;
- a new key admitted by a pattern or by `additionalProperties` enters at its sorted place when the keys of the mapping are sorted, and after the last key otherwise;
- a value checked in a field of kind `choices` enters at its place in the order of the admitted values.

When a collection is absent, or holds the null value or an unfilled value, it is written with its first entry. Under a key of a block mapping, the collection follows on the next lines, indented by two spaces under the key, and its unfilled value is erased. Inside a flow collection, the collection replaces the unfilled value in flow form. A new collection under a block mapping takes the form of its siblings, as the user decided on 2026-10-20. The siblings are the other items of the same sequence, or the other entries of the same mapping, that hold the same key. When every sibling writes that key as a flow collection, the new collection takes the flow form: a new row of gnomon receives `signature: [bob]`, as the other rows write `signature: [bob, t]`. Otherwise, and when the collection has no sibling, the new collection takes the block form. An empty sibling, written `[]` or `{}`, counts as a flow collection. A sibling holding the null value or an unfilled value at that key excludes the flow form. A new collection in flow form replaces the unfilled value on the line of its key. When that unfilled value is a block scalar, the new collection keeps the block form.

### Block collections

Four rules write the entries of a block collection:

- an inserted item starts with the indicator `-` at the column of the indicators of its siblings. An item holding a mapping writes its first key after the indicator, and its other keys aligned under the first;
- an inserted key takes the column of its siblings, and a nested collection is indented two spaces further. An empty nested collection is written `{}` or `[]`;
- a removed item or entry takes its lines with it. Each comment on those lines stays, on a line of its own at the column of the removed entry, as for a [cleared value](#^cleared-values);
- the removal of the only entry writes `[]` or `{}` after the key of the collection, before any comment of that line, since a block collection holds at least one entry.

### Flow collections

Four rules write the entries of a flow collection:

- an inserted entry follows the comma after its preceding sibling, or precedes the first entry with a comma of its own. When each entry of the collection starts a line, as in the multi-line mappings of geonexus, the new entry takes a line of its own at the column of its siblings. Otherwise, the entry joins the line of its neighbour, so `[pop, t]` becomes `[pop, t, x]`. In both layouts, a trailing comma after the last entry follows the new last entry;
- a removed entry takes one separating comma with it: the comma after it, or the comma before it for the last entry. The removal of the only entry leaves `[]` or `{}`;
- a removal is refused when its text holds a comment, since a comment inside a flow collection has no line of its own to remain on;
- the null value is written `null`, since an empty value cannot stand between two commas.

### Reordering

An item of a sequence moves by one position up or down. The text of each item between the old and the new position moves to the place of its new position. Therefore, the indicators, the commas and the comment lines between items stay in place, whereas a comment on the last line of an item moves with that item. The entries of a mapping keep the order of the file, since the form offers no reordering of keys. Across a move, each item keeps the identifier that keys its control, as the decision on the [form interface framework](../adr/form-interface-framework.md) requires. Its [field path](field-paths.md), by contrast, counts its new position.

### Unverified rules

The two consequences below arise in no fixture, so each was checked on one constructed text only:

- an insertion into a flow collection whose entries each start a line, after an entry followed by a comment, moves that comment to the line of the new entry;
- a flow collection spanning several lines whose entries do not all start a line receives a new entry on the line of its neighbour.

## Refused commits

A commit is written only once the new text is confirmed. The new text is parsed, and its document is compared with the expected document: the committed value at the edited field, and every other value unchanged. When the two documents differ, or when the new text fails to parse, the commit is refused. Four edits are also refused before any text is written:

- an edit of a value reached through an alias or merged by a merge key, whose text lies at its anchor. The item holding an alias can still be removed or moved;
- a removal that would delete a comment: inside a flow collection, or on the line of the first key of a sequence item;
- an insertion into an item of a block sequence that holds an unfilled value, such as `- open`;
- a structural edit made while the text of the file loads, since its positions may designate other items once the text is parsed.

A refused commit leaves the file unchanged. Its reason is displayed below its field, and the control keeps the typed text until the value of the field changes.

## Changes from outside

When the file changes outside the form view, for instance through the source view, a git checkout or another editor, the form view parses the file again and displays the new values. The focused control keeps its uncommitted text, and commits it to the same field path in the new text. While the text fails to parse, the form view keeps displaying the last form that parsed, under a notice giving the position of the error. The commits made meanwhile wait, and apply in their order once the text parses again. Commits made while a new text loads wait in the same way. Therefore, no commit can apply to a text already replaced by a change from outside.
