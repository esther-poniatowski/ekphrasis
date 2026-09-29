---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Key-path references
status: accepted
---
# Key-path references

> [!QUESTION] Goal: how does a link designate one key of a YAML note?

The [requirement on atomic references](../requirements.md#^atomic-references) calls for every key to be addressable, from notes as well as from programs. The [anchor declaration](anchor-declaration.md) labelled keys in comments. This decision supersedes that record.

## Decision

A link designates a key by its [key path](../features/key-paths.md), written as the subpath of the link. A YAML note declares no label. Instead, ekphrasis keeps references valid through a rename command and a report of broken references, as the [key references](../features/references.md) specify.

## Constraints

- **Coverage**: every key must be addressable without the author declaring it.
- **Machine readability**: a program must resolve a reference from the data alone.
- **Single syntax**: references and the patterns of view specifications must share one path syntax.
- **Stability**: a reference must survive when items are reordered, and a rename must be repairable across the vault.

## Options weighed

| Option | Benefit | Cost |
| --- | --- | --- |
| Label in a trailing comment, such as `# ^objective` | A label survives when its key is renamed or moved | Only declared keys are addressable, a program cannot read a comment, and the parser must associate each comment with its line |
| Key path with position segments only | No declaration, and the syntax is minimal | Inserted or reordered items change the positions, and silently redirect the references |
| Key path with value segments, a rename command and a report of broken references | Every key is addressable, programs resolve references, and the path syntax is shared with view specifications | A rename made outside ekphrasis, or a move of a key, breaks references until the report lists them |
| Key paths together with labels in comments | Labelled keys survive renaming and moving | Two reference mechanisms coexist, and the parser must still associate comments with lines |

## Consequences

- The parser ignores comments. The source map already records the key path of each block, so no index of labels is needed.
- A segment never contains brackets, since a wikilink ends at the first double closing bracket. Therefore, the type of the parent node decides whether a segment names a key or an item.
- Obsidian reads the subpath of a link as a heading name. Therefore, ekphrasis must itself scroll to the key and suggest key paths.
- A sequence referenced from other notes should give each item an identifying key, addressed by a value segment.
