---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Tags
---
# Tags

The tags of YAML instances join a hierarchical tree of tags, which a side panel displays and searches, as the [requirement on tags](../requirements.md#^tags) demands. The tree serves YAML instances as the tag pane of Obsidian serves notes.

## Tags of an instance

An instance carries tags from two sources:

- the key `tags` of its [metadata block](metadata.md);
- the tags written as `#tag` inside its values of kind `markdown-line` and `markdown`, which Obsidian renders as in a note. A `#` inside a value of another kind stays literal, as in `issue #2` or `C#`.

A tag holding a slash, such as `project/ekphrasis`, nests under its parent tag, as in Obsidian.

## Tag tree

A side panel displays every tag of the vault in one tree, each with the number of files carrying it. The tree joins the tags of the instances and the tags of the notes, since both belong to one vocabulary. A click on a tag lists those files, and a click on a file opens it, in the form view for an instance.

## Search

A search field at the top of the panel browses the tags. Its syntax is the part of the search syntax of Obsidian that concerns tags: tags separated by a space must all be carried, `-#tag` excludes a tag, `OR` admits either of two terms, and parentheses group terms. For instance, `#project/ekphrasis -#draft` designates the files carrying the tag `project/ekphrasis` and not the tag `draft`.
