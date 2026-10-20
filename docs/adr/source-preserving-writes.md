---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Source-preserving writes
status: accepted
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
- After each splice, ekphrasis parses the new text and compares the parsed document with the expected document: the committed value at the edited field, and every other value unchanged. When the two differ, the commit is not written, and an error is reported at the field.
- Ekphrasis selects scalar styles in the domain layer, so unit tests check the selected styles without Obsidian.

## Verification

The decision holds for the edit of every scalar that carries a token, as the [spike on byte preservation](../../tests/spikes/byte-preservation.test.ts) confirmed on 2026-10-01. Every scalar of the fixtures, keys included, was edited through the function `CST.setScalarValue` of the `yaml` library, once in the style of its token and once in another style. Five properties held for every edit:

- every byte outside the token of the edited scalar is identical;
- every comment is kept, in the same order;
- the new text equals the old text with the new token spliced at the range of the old token;
- the new text holds no parse error absent from the old text;
- the edited scalar parses back to the committed value.

The same edits preserved every byte outside the token in 63 files of gnomon and 120 files of geonexus, read by the optional corpus test. Therefore, the concrete syntax tree of the `yaml` library can produce the new text of a scalar. Splicing that text at the range of the token implements this decision.

Three constraints follow for the milestone *Saving of scalars*:

- An empty value, written as a bare key, carries no token, so its first value must be inserted after the key.
- `CST.setScalarValue` must be told where the scalar stands: as an implicit key, inside a flow collection, or as a value after a key. The caller derives these flags from the ancestors of the node.
- A value that the style of its token cannot represent must be written with an explicit scalar type, so the domain layer must still select the style of each value.

The milestone *Saving of scalars* meets the three constraints in the [plan of commits](../../src/domain/edit/commit-plan.ts):

- a bare key receives its value after its colon, and a block scalar keeps its header on the line of the key;
- the domain derives the context of each scalar from its parent, and the writer converts that context into the flags of `CST.setScalarValue`;
- the domain selects the style of every written value, and the writer passes it as an explicit scalar type.

The [golden test of byte preservation](../../tests/acceptance/saving.test.ts) also verifies inserting and removing keys of block mappings. From the milestone *Collections*, the same test also makes structural edits on every collection of the fixtures:

- each item removed, and moved one position up and down;
- the next item of each sequence inserted, by the edit of its first value;
- each entry of a keyed mapping removed, and a new entry inserted;
- each unchecked value of a field of kind `choices` inserted;
- each key of a flow mapping inserted and removed, by the edits of its scalars.

Each written edit keeps every comment, and changes no byte outside the lines of its collection. The [corpus test of structural edits](../../tests/acceptance/corpus-collections.test.ts) made the same edits on 2026-10-20. That test wrote 396 commits on the 8 target-system records of gnomon, and 1169 commits on the 16 glossaries of geonexus, without a failure. Two insertion rules into flow collections remain verified on constructed texts only, as the [rules of collections](../features/saving.md#^structural-edits) list.
