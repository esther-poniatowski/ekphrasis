---
tags:
  - requirements
index: "[ekphrasis documentation](docs/_index.md)"
aliases:
  - Requirements
---
# Requirements

The requirements of ekphrasis are the properties needed from the plugin by a project that fills YAML records against schemas. Each instance in such a project serves [two readers](overview.md): a person fills and reads the values through a form, and a program reads the data. To justify a design choice, feature notes and decision records cite a requirement by its block anchor.

## Filling

- **Guided creation**: a command must create a new instance of a schema, with default values filled, and with every field that requires an explicit choice left unfilled. ^guided-creation
- **Typed controls**: each field must be edited through a control suited to its kind, from single words and choices to Markdown paragraphs, LaTeX formulas, lists and tables. ^typed-controls
- **Instructions on demand**: the instructions and the examples of each field must be displayable at the field, and hidden otherwise. ^instructions-on-demand
- **Rendered content**: Markdown and LaTeX values must display as Obsidian renders them in a note. ^rendered-content
- **Images**: a form must display the images of its record, such as SVG and PNG files of the vault, embedded in its values or held by a field. ^images
- **Field formats**: internal links with a display text, web addresses, email addresses, telephone numbers, tasks and dates of several precisions must each be edited through a control of their own. ^field-formats
- **List editing**: an item must be insertable at any position of a list, movable by dragging, and orderable by a declared mode. ^list-editing
- **Conditional fields**: the value of a field must determine which of its dependent subfields the form displays. ^conditional-fields

## Navigation

- **Visible structure**: keys must be distinguished from the areas holding the values, and each nested group must be collapsible. ^visible-structure
- **Schema styles**: the presentation of the forms of a schema, such as the widths of its fields, their icons and the placement of their labels, must be declarable apart from the schema. ^schema-styles
- **Outline**: a side panel must display the structure of the instance, and a click on an entry of that panel must move the form to the field. ^outline
- **Links in values**: the Markdown links and the wikilinks of a value must resolve as in a note stored in the folder of the instance. ^links-in-values
- **Field links**: a link must be able to designate a field of a YAML instance, by the path of its file or by the identifier of its record, together with its field path. Following such a link, from a form or from a note, must open the form at that field. ^field-links
- **Metadata block**: a field of an instance, named for the whole vault and per schema, must hold the metadata of its record, displayed apart from the form as the properties of a note are displayed. ^metadata-block
- **Aliases**: the aliases of an instance must appear among the suggestions of a link, and fill the display text of the link inserted from them. ^aliases
- **Tags**: the tags of an instance, from its metadata block and from its values, must join a hierarchical tree of tags, which a search can browse with combinations and exclusions of tags. ^tags

## Validation

- **Declared rules**: validity rules must be declarable in the schema at four scopes: one field, the whole instance, a relation between fields, and a condition on other fields. ^declared-rules
- **Custom checkers**: a rule beyond the predefined checkers must be implementable in Python and registered in the plugin. ^custom-checkers
- **Custom kinds**: a user must be able to define a field kind of their own, with its control and its checker. ^custom-kinds
- **Visible issues**: each missing or invalid field must be highlighted in the form and in the outline. ^visible-issues

## Integrity

- **Progressive saving**: every edit must be saved without a submission step, including an edit that leaves the instance incomplete or invalid. ^progressive-saving
- **Machine readability**: an instance must remain an ordinary YAML file, read by a standard YAML parser without preprocessing. ^machine-readability
- **Source preservation**: an edit must change only the edited value, so the comments, the key order, the scalar styles and the other values stay unchanged in the file. ^source-preservation
- **Source access**: the YAML text of an instance must remain editable within Obsidian. ^source-access

## Schema authoring

- **Schema editor**: an interactive editor must create and modify schemas, including the kind, the rules and the instructions of each field. ^schema-editor
- **Schema versions**: successive versions of a schema must be managed, so that each instance remains checkable against the version for which it was written. ^schema-versions
