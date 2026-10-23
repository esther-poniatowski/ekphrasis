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

Three further forms of a link by path are admitted:

- a link without a hash sign, such as `[[intermittency.yml]]`, designates the root of the instance;
- a link with an empty path, such as `[[#task.epistemic_aim]]`, designates a field of the instance holding the link;
- a Markdown link writes each space of its path and of its field path as `%20`, or encloses its destination in angle brackets, as in `[aim](<my records/intermittency.yml#task.epistemic_aim>)`.

A link to a note takes the same form, as `[[note#Heading]]` does. Therefore, the subpath of a link is read as a field path only when the path of the link resolves to a YAML file.

## Field links by identifier

A field link by identifier names the record by the value of its identifier, then the field by its field path. Such a link stays valid after a move or a rename of the file of the record, as long as the identifier of the record stays unchanged. The link is a URI of Obsidian handled by ekphrasis, as the [decision on record identifiers](../adr/record-identifiers.md) records:

```markdown
[epistemic aim](obsidian://ekphrasis?id=quest.pendulum.sustained-oscillation&field=task.epistemic_aim)
```

The URI takes three parameters, each percent-encoded:

| Parameter | Value | Absence |
| --- | --- | --- |
| `id` | Identifier of the record | Makes the link malformed |
| `field` | Field path of the field, such as `maturity%5B%22task.aim%22%5D` for `maturity["task.aim"]` | Designates the root of the record |
| `vault` | Name of the vault | Leaves the choice of the vault to Obsidian |

The schema of a record type names the field holding the identifier by the keyword `x-identifier`, among the [keywords of ekphrasis](schemas.md). The identifier of a record is the text of that field. When that field is absent or empty, or holds a value other than a text, the record declares no identifier.

Ekphrasis keeps an index that maps each identifier to the files declaring it. The index reads each YAML file of the vault through the schema bound to that file. Then, the index follows the changes of the vault and of the settings:

- a file created, changed or renamed is read;
- a deleted file leaves the index;
- a change of a schema file reads again every file whose binding reads that schema file;
- a change of the path rules of the settings reads every file again, since a rule can bind a file to another schema.

An identifier declared by several files is ambiguous: a link to it opens no file, and a notice lists the files. Files of different record types can also declare the same identifier, since the identifiers of geonexus are unique within one type only.

## Following a link

Following a field link, from a value of a form or from a note, opens the target instance in the form view. The form then moves to the field, as a click on an entry of the [outline](outline.md) does: the groups containing the field expand, and its control receives the focus. When the field path designates no field of the instance, the form opens at its top, and a notice names the path not found.

A malformed field link opens no file. A notice then states its defect:

- a wikilink not closed by `]]`, or a Markdown link outside the form `[text](destination)`;
- a space in the destination of a Markdown link, outside angle brackets;
- a hash sign followed by no field path;
- a malformed field path, or a field path holding a wildcard, since a link designates one field;
- a malformed percent-encoding;
- a URI of ekphrasis without the parameter `id`, or repeating a parameter.

## Writing links

Two aids write field links:

- typing a hash sign after the path of an instance in a link suggests the field paths of that instance, as Obsidian suggests the headings of a note;
- the command *Copy link to field* copies a link to the focused field, by identifier when the record declares an identifier through `x-identifier`, and else by path.

The command writes a link by path in the link format chosen in the settings of Obsidian, Markdown link or wikilink. The text of the link is the label of the field. The note that will receive the link is unknown at the copy, so the path of the link starts from the vault root. Before the copy, the command parses the link written. When the parsed link designates another field, the command copies no link, and a notice shows the link written. The link written designates another field when the link format alters a bracket, a quote or a space of the field path.
