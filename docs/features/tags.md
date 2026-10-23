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
- the tags written inside its values, as `#tag` in a note.

A tag holding a slash, such as `project/ekphrasis`, nests under its parent tag, as in Obsidian.

## Tag tree

A side panel displays every tag in a tree, each with the number of files carrying it. A click on a tag lists those files, and a click on a file opens it, in the form view for an instance.

## Search

A search field at the top of the panel browses the tags. Its syntax combines tags and excludes them, so that a query designates the files carrying one set of tags and none of another.
