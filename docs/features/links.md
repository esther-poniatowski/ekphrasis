---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Links
---
# Links

A link can designate a field of a YAML instance, from a value of a form or from a note of the vault, as the [requirement on field links](../requirements.md#^field-links) demands. Following such a link opens the instance in the form view at that field. The links of a value also resolve as in a note, as the [requirement on links in values](../requirements.md#^links-in-values) demands.

## Links in values

A value of kind `markdown-line` or `markdown` renders its links through the Markdown renderer of Obsidian, as the [form view](form-view.md) specifies. Therefore, each link of a value resolves as in a note stored in the folder of the instance:

- a Markdown link `[text](path)` resolves its relative path from the folder of the instance, and writes a space of the path as `%20`;
- a wikilink `[[name]]` resolves by the name of its target, as in any note;
- a subpath `#heading` or `#^block` designates a part of the note reached.

## Field links by path

A field link by path appends the [field path](field-paths.md) of the field to the path of the instance, after a hash sign. The field path starts from the root of the target instance, so the link resolves from the target file alone. The two links below designate the epistemic aim of a question record, as a Markdown link and as a wikilink:

```markdown
[epistemic aim](../questions/intermittency.yml#task.epistemic_aim)
[[intermittency.yml#task.epistemic_aim]]
```

## Field links by identifier

A field link by identifier names the record by the value of its identifier, then the field by its field path. Such a link survives a move or a rename of the file of the record. Its resolution needs an index of the identifiers declared across the vault. The syntax of the link, the declaration of the identifier of a record type, and the location of the index remain open, as the [roadmap](../../TODO.md) records.

## Following a link

Following a field link, from a value of a form or from a note, opens the target instance in the form view. The form then moves to the field, as a click on an entry of the [outline](outline.md) does: the groups containing the field expand, and its control receives the focus. When the field path designates no field of the instance, the form opens at its top, and a notice names the path not found.

## Writing links

Two aids write field links by path:

- typing a hash sign after the path of an instance in a link suggests the field paths of that instance, as Obsidian suggests the headings of a note;
- the command *Copy link to field* copies a link to the focused field, in the link format set in the settings of Obsidian, Markdown link or wikilink.
