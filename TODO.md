# Roadmap

The roadmap of ekphrasis lists the steps that implement each [feature](docs/features/_index.md), with the state of each step. Each completed step carries the date of its check. Within each section, a step follows the steps that it relies on.

## Current code

- [ ] Retire the reading view, the Markdown projection and the code block `yaml-view`, and keep the parser adapter that reports source ranges.

## YAML instances

- [ ] Confirm in a test vault how Obsidian behaves when another enabled plugin registers the extension `.yaml` or `.yml`.
- [ ] Register the extensions `.yaml` and `.yml` for the view of ekphrasis, and open a file bound to no schema in the source view.
- [ ] Resolve the schema of an instance from its modeline, and else from the path rules of the settings.

## Schemas

- [ ] Load schemas written in JSON or in YAML, and resolve the keyword `$ref` across files.
- [ ] Validate instances with a JSON Schema validator for draft 2020-12 that accepts the keywords prefixed `x-`.
- [ ] Derive the kind of each field from the keyword `x-kind`, and else from the standard keywords.

## Form view

- [ ] Build the form model from the schema and the parsed instance.
- [ ] Display one control per scalar kind, and render the values of kind `markdown-line`, `markdown` and `latex` through the renderers of Obsidian.
- [ ] Display one control per collection kind, including the tables and the alternatives.
- [ ] Display the instructions and the examples of a field on demand.
- [ ] Collapse and expand groups and collections, following the keyword `x-collapsed` when the form opens, and provide the commands *Collapse all* and *Expand all*.
- [ ] Display the keys outside the schema in a read-only area.
- [ ] Render first the fields that enter the visible area of a long instance.

## Source view

- [ ] Bundle a YAML language mode, exclude it from the external packages of the bundler, and host the source view in the view of ekphrasis.
- [ ] Switch between the form view and the source view, by a header button and a command.

## Saving

- [ ] Commit a control when it loses the focus, when typing pauses for the delay of the settings, and at each change of a dropdown, a toggle or a checkbox.
- [ ] Splice the text of a committed value into the source range of its node, and confirm the committed value by parsing the new text.
- [ ] Select the scalar style of each new or edited value.
- [ ] Insert new keys, items and rows with the indentation of their siblings.
- [ ] Remove the key of a cleared optional field, and write the unfilled value of a cleared required field.
- [ ] Parse the file again after a change made outside, and keep the text of the focused control.

## Validation

- [ ] Report unfilled required fields as missing before any other check.
- [ ] Implement the predefined checkers, and resolve the relative field paths of relational and conditional rules.
- [ ] Display the issues at their fields and in the headings of the groups containing them.
- [ ] Provide the command *Validate instance*.

## Outline

- [ ] Display the entries of the active instance, and move the form to the field of a clicked entry.
- [ ] Mark the entries with issues, and restrict the outline to them on demand.

## Instance creation

- [ ] Write the skeleton of a new instance, with its modeline when no path rule binds its path.
- [ ] Add the schema folder to the settings, and offer its schemas together with those of the path rules.
- [ ] Provide the command *Create instance*, and one command per schema declared with a command name.

## Custom checkers

- [ ] Ship the runner script, start the Python process with the interpreter of the settings, and exchange one JSON message per line.
- [ ] Register the checker modules and their names in the settings tab.
- [ ] Bound each call by a timeout, discard stale results, and provide the command *Restart Python checkers*.

## Schema editor

- [ ] Decide how an instance records the version of its schema: a versioned schema file named by the modeline, or a data field fixed by the keyword `const`.
- [ ] Write the meta-schema of the schema dialect.
- [ ] Provide the command *Create schema*, and the preview panel of the form under edit.

## Examples and tooling

- [ ] Replace the example vault by schemas with keywords of ekphrasis, and by instances bound to them.
- [ ] Publish releases through a workflow that attaches the plugin bundle, the manifest and the style sheet.
