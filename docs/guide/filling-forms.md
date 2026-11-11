---
tags:
  - guide
index: "[User guide](docs/guide/_index.md)"
aliases:
  - Filling a form
---
# Filling a form

Follow the [installation steps](installation.md) to install Ekphrasis in the vault. Keep the schema in the same vault. The record can resolve the schema through the configured registry, a modeline or a path rule. The [binding sources](../features/instance-files.md#^binding-sources) specify their order. Follow the guide on [writing a schema](writing-schemas.md) to define the schema.

## Creating a record

To start a record, the configured schema registry must contain its writable contract. Then, the author creates the record in three steps:

1. Run the command *Create instance* from the command palette.
2. Choose the titled contract and verify its logical identifier.
3. Enter the path of the new file, with the extension `.yaml` or `.yml`.

The command refuses an existing path, so it cannot overwrite a record. The new file opens in the form view and follows the [skeleton rules](../features/instance-creation.md#^skeleton).

## Filling the fields

The form displays each required field and each field already stated in the record. A choice can make another field applicable, and the form then reveals that field. Likewise, an issue at an absent field reveals the repair target. If the choice changes before the researcher enters a value, the field disappears. A field holding an authored value remains visible. For an unrelated optional field, select it from *+ Add a field*. This manual selection displays the control without changing the file. The first committed value adds the field to the file. The action *Discard* closes an uncommitted field selected manually.

Enter the value of each displayed field in its control. Ekphrasis saves the value as specified under [saving](../features/saving.md). A text field saves when the focus leaves its control. A pause in typing also saves the field after the configured *commit delay*. Therefore, the author can close the file and resume after reopening the record.

Four aids of the [form view](../features/form-view.md) help the author fill the fields:

- the help button beside a label displays the instructions and the examples of the field;
- a Markdown or LaTeX value displays rendered, and a click on it opens its text for editing;
- a group or a table can be collapsed, so that the form shows the part under work only;
- the [outline](../features/outline.md) in the side panel, opened by the command *Show outline*, moves the form to any field in one click, and its search, opened by the command *Search the fields*, finds a field by its name.

## Correcting issues

Before correcting issues, read any checker context below the schema path. A project checker can use this block to name the completion target applied to the partial record and to distinguish later work from current defects. This context is not an issue.

To list the remaining work, the author restricts the outline to the entries with issues, and follows each entry to its highlighted field. The box *Validation* at the top of the form also names each field holding an issue, and a click on a name moves the form to that field. To run every rule at once, including the custom checkers of the project, the author runs the command *Validate instance*. The meaning of each issue is specified under [validation](../features/validation.md).

## Opening a generated view

To inspect the view associated with a completion target, configure the project command under *Primary-view command*. For Gnomon, use the following argument list with the Python interpreter of the Gnomon environment:

```json
["-m", "gnomon", "views", "{vault}", "--scope", "{target}", "--output", "{vault}/views", "--result", "json"]
```

Run *Open primary view*, enter the completion target, and select *Generate and open*. Gnomon selects the primary view and returns its path. Ekphrasis opens that generated YAML file without maintaining another view state. The [generated-view specification](../features/generated-views.md#^primary-view-route) defines the generic producer contract.

## Editing the YAML text

Two edits are possible in the YAML text only: a key absent from the schema, and a comment. The command *Toggle form and source view* switches to the YAML text of the file, and back to the form.
