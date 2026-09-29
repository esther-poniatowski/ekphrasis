---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Key references
---
# Key references

A key reference links one key of a YAML note from any note, as the [requirement on atomic references](../requirements.md#^atomic-references) demands. The link carries the [key path](key-paths.md) of that key as its subpath. Therefore, every key is addressable without being declared in the YAML note.

## Syntax

To reference a key, a link appends a hash sign and the key path to the path of the YAML note, in either link format. The first two lines below reference the key `model.objective` of the YAML note `specs/model.yaml.md`, as a wikilink and as a Markdown link. The third line references an item of a sequence from within the same YAML note:

```markdown
[[specs/model.yaml#model.objective]]
[training objective](specs/model.yaml.md#model.objective)
[[#model.components.name=encoder]]
```

To give a program a reference to follow, a value of a YAML note can also hold a key path without a link. The program resolves such a value with the same syntax, from the data alone.

## Resolution

Following a key reference opens the YAML note in the [reading mode](editing.md), where the designated key is scrolled into view and highlighted. When the key path designates no node, the note opens at its start, and a notice names the unresolved path.

Obsidian reads the subpath of a link as the name of a heading, and a YAML body holds no Markdown heading. Therefore, Obsidian neither scrolls to the key nor suggests key paths, so ekphrasis must provide both functions. The reading mode records the key path of each rendered block, so ekphrasis resolves a key path without an index of its own.

## Suggestions

When an author types a hash sign after the path of a YAML note in a link, ekphrasis suggests the key paths of that note. For an item that carries an identifying key, the suggested path designates the item by a value segment in preference to a position segment. The [stability of key paths](key-paths.md#^stability) requires this preference.

## Maintenance

When a key is renamed or moved, its key path changes, and the references to the former path designate no node. Two commands of ekphrasis keep the references valid:

- *Rename key* renames the key under the cursor in the editing mode, and rewrites every reference to that key or to its descendants across the vault;
- *Report broken key references* lists every link whose key path designates no node of its YAML note.

A key reference appears in the backlinks of the YAML note, since Obsidian records the target note of a link independently of its subpath. The rename command finds the references among these backlinks. The rename command does not cover a key moved to another parent. For such a key, the report lists the references to update.
