---
tags:
  - conventions
index: "[ekphrasis documentation](docs/_index.md)"
aliases:
  - Documentation conventions
---
# Documentation conventions

Every Markdown file of the documentation folder `docs/` is a note. To stay findable and citable, each note declares its metadata in a frontmatter block and is registered in the index of its folder.

## Frontmatter

Three keys open every note, in a fixed order, so that a diff shows any key out of place. The frontmatter below opens a feature note of the folder `docs/features/`:

```yaml
---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Field paths
---
```

- The key `tags` names the category of the note, drawn from the [tag vocabulary](#^tag-vocabulary).
- The key `index` links the index of the folder holding the note, by a Markdown link whose path starts at the repository root. An index file links the index of its parent folder, and the root index omits the key.
- The key `aliases` fixes the name used to cite the note, and each alias is unique across the documentation.

A decision record adds a fourth key, `status`, whose value states whether the decision is proposed, accepted or superseded.

Each tag of the vocabulary names one category of note:

| Tag | Category of note |
| --- | --- |
| `index` | Entry point of a folder |
| `overview` | Purpose and scope of the plugin |
| `requirements` | Properties required of the plugin |
| `assessment` | Existing plugins measured against the requirements |
| `architecture` | Structure of the source code |
| `feature` | Syntax and behaviour of one feature |
| `guide` | Tasks performed by an author with the plugin |
| `decision` | Architecture decision record |
| `conventions` | Rules for writing the documentation |
| `prompt` | Instructions for an AI agent |
| `handoff` | State of the work carried between agent sessions |

^tag-vocabulary

## Registration

Each folder carries an index file `_index.md` that registers every file of the folder. A note is registered in the edit that creates it. When registration is deferred to a later edit, the note typically stays unregistered, because that edit serves another concern. Within an index, each entry gives the title of its note as link text, followed by one clause stating the goal of a reader who opens the note. The clause opens on a verb in the present tense, whose implicit subject is the note, and ends without a period, as in `- [Saving](saving.md): predicts how each edit changes the YAML file`. The entry never summarizes the content of that note.

## Cross-references

A cross-reference is a relative Markdown link carrying the extension `.md`, so that the link resolves both in Obsidian and on the repository page. To cite one statement, a cross-reference appends a block anchor to the path. This anchor is declared at the end of the target line. The link below targets the anchor of the requirement on source preservation:

```markdown
the [source preservation](../requirements.md#^source-preservation)
```

Link text names the object found at the target, never the file name. When a note or an anchor is renamed, every inbound link must be updated in the same change.

## Prose

Each paragraph occupies a single line, and the editor wraps that line for display. Each sentence opens on the topic left open by the preceding sentence, and carries one claim. A mechanism is named literally, never through an image of it.
