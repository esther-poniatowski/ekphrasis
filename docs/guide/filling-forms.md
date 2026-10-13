---
tags:
  - guide
index: "[User guide](docs/guide/_index.md)"
aliases:
  - Filling a form
---
# Filling a form

Ekphrasis must already be installed in the vault, following the [installation steps](installation.md). The schema of the record must exist in the vault, and must be known to the plugin through a path rule or the schema folder of the settings, as specified for [instance creation](../features/instance-creation.md). The schema itself is written following the guide on [writing a schema](writing-schemas.md).

## Creating a record

To start a record, the author creates an instance from its schema, in three steps:

1. Run the command *Create instance* from the command palette.
2. Choose the schema of the record.
3. Enter the path of the new file, with the extension `.yaml` or `.yml`.

The new file opens in the form view, with the content specified under [instance creation](../features/instance-creation.md).

## Filling the fields

Each field is filled in its control, and each change is saved into the file as specified for [saving](../features/saving.md). A text field saves its value when it loses the focus, or when typing pauses for the *commit delay* set in the settings of ekphrasis. Therefore, the author can close the file at any point and resume later. Four aids of the [form view](../features/form-view.md) help the author fill the fields:

- the help button beside a label displays the instructions and the examples of the field;
- a Markdown or LaTeX value displays rendered, and a click on it opens its text for editing;
- a group or a table can be collapsed, so that the form shows the part under work only;
- the [outline](../features/outline.md) in the side panel moves the form to any field in one click.

## Correcting issues

To list the remaining work, the author restricts the outline to the entries with issues, and follows each entry to its highlighted field. To run every rule at once, including the custom checkers of the project, the author runs the command *Validate instance*. The meaning of each issue is specified under [validation](../features/validation.md).

## Editing the YAML text

Two edits are possible in the YAML text only: a key absent from the schema, and a comment. The command *Toggle form and source view* switches to the YAML text of the file, and back to the form.
