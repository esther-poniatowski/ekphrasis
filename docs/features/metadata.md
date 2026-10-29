---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Metadata
---
# Metadata

The metadata of an instance describes the file of its record, apart from the content that the form displays, as the [requirement on a metadata block](../requirements.md#^metadata-block) demands. Ekphrasis displays the metadata as Obsidian displays the properties of a note, and reproduces three functions of those properties: aliases, tags, and links.

## Metadata block

The metadata of an instance is held by one field of the instance, its metadata block. Two sources name that field, the second overriding the first:

- the setting *Metadata field* of the plugin names it for every instance of the vault;
- the keyword `x-metadata` at the root of a schema names it for the instances of that schema, by its [field path](field-paths.md).

The setting is empty by default, so an instance holds a metadata block only when the setting or its schema names one. A project whose content holds a key `metadata` therefore keeps that key in its form. The vaults of geonexus set the setting to `metadata`.

The specifications of geonexus, for instance, hold their metadata under the key `metadata`, whose schema declares the keys of the frontmatter of a note:

```yaml
metadata:
  role: spec
  status: draft
  index: "[Audiences](audiences/_index.md)"
  aliases: [Cognitive psychologists]
  tags: []
```

## Display

The metadata block displays apart from the fields of the form, as a panel of properties above them. The panel can be folded, and a setting shows or hides it, as Obsidian shows or hides the properties of its notes. Each key of the block keeps the control of its [kind](field-kinds.md), its instructions and its [validation](validation.md). The [outline](outline.md) opens on one entry *Metadata*, holding an entry per key, and the summary at the top of the form counts the issues of the block with those of the other fields.

## Aliases

The key `aliases` of the metadata block holds the other names of the record, as the [requirement on aliases](../requirements.md#^aliases) demands. Each alias appears among the suggestions of a link, beside the name of the file. Choosing an alias inserts a link to the instance whose display text is that alias, such as `[Cognitive psychologists](audiences/cognitive-psychologists.yml)` or `[[cognitive-psychologists.yml|Cognitive psychologists]]`, in the link format set in the settings of Obsidian.

## Tags

The key `tags` of the metadata block holds the tags of the record, written as in the property `tags` of a note. These tags join the [tags](tags.md) of the vault.

## Links

The links of the metadata block render and resolve as the links of the properties of a note, as specified for the [links in values](links.md).
