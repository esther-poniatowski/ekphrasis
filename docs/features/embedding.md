---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Embedding
---
# Embedding

An embedding displays a rendered YAML note, or a single key of a YAML note, inside another note. Obsidian already offers a native embed syntax, in which an exclamation mark precedes a link. However, ekphrasis does not process this syntax, so the native embed displays the body of a YAML note as Markdown text.

Instead, a rendered embedding is declared by a code block of language `yaml-view`. The body of that code block holds one option per line. The block below embeds the key `model.objective` of the YAML note `specs/model.yaml.md`:

````markdown
```yaml-view
src: specs/model.yaml.md
path: model.objective
```
````

The code block accepts two options:

| Option | Value | Presence |
| --- | --- | --- |
| `src` | Path of the YAML note, resolved from the embedding note as a link | Required |
| `path` | [Key path](key-paths.md) of the embedded key | Optional; without it, the whole body displays |

The embedded content displays under the [view specification](view-specifications.md) of its YAML note. The embedding renders again whenever that YAML note changes. When the note path or the key path does not resolve, an error displays in place of the content.
