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

A link to a note takes the same form, as `[[note#Heading]]` does. Therefore, the subpath of a link is read as a field path only when the path of the link resolves to a YAML file. The path must hold the extension of the file, `.yml` or `.yaml`, since Obsidian resolves no link to a YAML file without its extension, and a click on such a link creates a note.

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

An identifier declared by several files is ambiguous: a link to it opens no file, and a notice lists the files. Files of different record types can also declare the same identifier, since the identifiers of geonexus are unique within one type only. A link to an unknown identifier also leaves every file closed, and a notice names that identifier. The index is built once Obsidian has loaded the vault, so a link by identifier followed while Obsidian starts waits for that build.

## Following a link

Following a field link, from a value of a form or from a note, opens the target instance in the form view. Then, the form moves to the field, as a click on an entry of the [outline](outline.md) does: the groups containing the field expand, and its control receives the focus. A pane displaying the source view of the instance switches to the form view. When the field path designates no field of the instance, the form opens at its top, and a notice names the path not found.

Obsidian opens the file of a link by path, then passes the subpath of the link to the view of ekphrasis. A field path percent-encoded by a Markdown link, such as `nested[%22a%20key%22]`, is read decoded when its written form holds no valid field path. A link by identifier reaches ekphrasis through the handler of its URI, and a click on such a URI in a value is followed by ekphrasis directly. Any other external link of a value, such as `https://…`, keeps the behaviour of Obsidian: a web address opens in the browser.

A malformed field link followed from a value of a form, or through a URI of ekphrasis, opens no file, and a notice states its defect. A link followed from a note reaches ekphrasis only once Obsidian has opened its file. Therefore, a malformed field path in a note leaves the form at its top, with the same notice. The defects are the following:

- a wikilink not closed by `]]`, or a Markdown link outside the form `[text](destination)`;
- a space in the destination of a Markdown link, outside angle brackets;
- a hash sign followed by no field path;
- a malformed field path, or a field path holding a wildcard, since a link designates one field;
- a malformed percent-encoding;
- a URI of ekphrasis without the parameter `id`, or repeating a parameter.

## Writing links

Two aids write field links:

- typing a hash sign after the path of an instance in a Markdown link, as in `[aim](intermittency.yml#`, suggests the field paths of that instance, as Obsidian suggests the headings of a note. In a wikilink, the suggestion of headings of Obsidian takes over, so no field path is suggested there;
- the command *Copy link to field* copies a link to the focused field, by identifier when the record declares an identifier through `x-identifier`, and else by path.

The suggestions list the paths starting with the text typed after the hash sign first, then the paths and the names containing it, ignoring case. A selected path is written into the destination of the link with its percent signs, spaces, parentheses and angle brackets percent-encoded, such as `nested["a%20key"]`. Inside angle brackets, only the percent signs and the angle brackets are encoded.

The command links a record by its identifier only when no other file declares that identifier, since a link to an ambiguous identifier opens no file. A link by identifier is a Markdown link in either link format, since a wikilink cannot hold a URI. The command writes a link by path in the link format chosen in the settings of Obsidian, Markdown link or wikilink. The text of the link is the label of the field. An item of a list is labelled by its position only, such as `#2`, so the text of a link to an item joins the label of its list and the label of the item, such as `Foils #2`. An item of a list of lists joins the label of every list containing it, such as `grid #1 #2`. The root of an untitled record carries an empty label, so a link by identifier to it takes the identifier as its text. The note that will receive the link is unknown at the copy, so the path of the link starts from the vault root. Before the copy, the command parses the link written. When the parsed link designates another field, the command copies no link, and a notice shows the link written. The link written designates another field when the link format alters a bracket, a quote or a space of the field path.
