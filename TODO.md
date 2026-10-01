# Roadmap

The roadmap of ekphrasis lists the steps of each milestone of the [implementation plan](docs/architecture/implementation-plan.md), with the state of each step. Each step opens with the [feature](docs/features/_index.md) that it implements, and each completed step carries the date of its check. Within each milestone, a step follows the steps that it relies on.

## Toolchain and spikes

- [ ] **Tooling**: commit a lock file, so that `npm ci` passes in continuous integration.
- [ ] **Tooling**: add `preact`, compile JSX with the import source `preact`, cover the files `.tsx` in the TypeScript, ESLint and Vitest configurations, and forbid `preact` outside the adapters layer.
- [ ] **Tooling**: retire the reading view, the Markdown projection and the code block `yaml-view`, and keep the parser adapter that reports source ranges.
- [ ] **YAML instances**: confirm in a test vault how Obsidian behaves when another enabled plugin registers the extension `.yaml` or `.yml`.
- [ ] **Validation**: confirm that Ajv compiles a schema with keywords prefixed `x-` inside Obsidian.
- [ ] **Saving**: confirm on the fixtures that a splice through the syntax tree of the `yaml` library preserves every untouched byte.
- [ ] **Form view**: measure the rendering of one hundred Markdown values and one hundred formulas in one view.
- [ ] **Custom checkers**: confirm that a desktop plugin starts a Python process, exchanges one message, and stops the process when the vault closes.
- [ ] **Tooling**: write the fixtures reproducing the constructs of the consumer projects, and the optional corpus test reading their records.

## Bound form

- [ ] **YAML instances**: register the extensions `.yaml` and `.yml` for the view of ekphrasis, and open a file bound to no schema in the source view.
- [ ] **YAML instances**: resolve the schema of an instance from its modeline, and else from the path rules of the settings.
- [ ] **Schemas**: load schemas written in JSON or in YAML, and resolve the keyword `$ref` across files.
- [ ] **Field kinds**: derive the kind of each field from the keyword `x-kind`, and else from the standard keywords.
- [ ] **Form view**: build the form model from the schema and the parsed instance.
- [ ] **Form view**: display one control per scalar kind.
- [ ] **Form view**: bundle a YAML language mode, exclude it from the external packages of the bundler, and host the source view in the view of ekphrasis.
- [ ] **Form view**: switch between the form view and the source view, by a header button and a command.

## Saving of scalars

- [ ] **Saving**: commit a control when it loses the focus, when typing pauses for the delay of the settings, and at each change of a dropdown, a toggle or a checkbox.
- [ ] **Saving**: splice the text of a committed value into the source range of its node, and confirm the committed value by parsing the new text.
- [ ] **Saving**: select the scalar style of each new or edited value.
- [ ] **Saving**: insert the key of an absent optional field at its first edit, with the indentation of its siblings.
- [ ] **Saving**: remove the key of a cleared optional field, and write the unfilled value of a cleared required field.
- [ ] **Saving**: parse the file again after a change made outside, and keep the text of the focused control.

## Validation

- [ ] **Validation**: report unfilled required fields as missing before any other check.
- [ ] **Validation**: validate instances with a JSON Schema validator for draft 2020-12 that accepts the keywords prefixed `x-`, and convert its error locations into field paths.
- [ ] **Validation**: implement the predefined checkers, and resolve the relative field paths of relational and conditional rules.
- [ ] **Validation**: evaluate predefined checkers for the rule families shared by the consumer projects (references across files, uniqueness, acyclicity), declared in the schema, so that custom checkers serve project-specific rules only.
- [ ] **Validation**: display the issues at their fields and in the headings of the groups containing them.
- [ ] **Validation**: provide the command *Validate instance*.

## Collections

- [ ] **Field kinds**: display one control per collection kind, including the tables and the alternatives.
- [ ] **Form view**: give each item of a sequence an identifier kept across reorderings.
- [ ] **Saving**: decide whether an edit inside a flow collection keeps its flow form or converts the collection to block form, and implement the insertion and removal of entries with their separating commas.
- [ ] **Saving**: insert, remove and reorder items and rows with the indentation of their siblings.
- [ ] **Form view**: collapse and expand groups and collections, following the keyword `x-collapsed` when the form opens, and provide the commands *Collapse all* and *Expand all*.

## Guidance and navigation

- [ ] **Form view**: display the instructions and the examples of a field on demand.
- [ ] **Form view**: render the values of kind `markdown-line`, `markdown` and `latex` through the renderers of Obsidian.
- [ ] **Form view**: render first the fields that enter the visible area of a long instance.
- [ ] **Form view**: display the keys outside the schema in a read-only area.
- [ ] **Outline**: display the entries of the active instance, and move the form to the field of a clicked entry.
- [ ] **Outline**: mark the entries with issues, and restrict the outline to them on demand.

## Instance creation

- [ ] **Instance creation**: write the skeleton of a new instance, with its modeline when no path rule binds its path.
- [ ] **Instance creation**: add the schema folder to the settings, and offer its schemas together with those of the path rules.
- [ ] **Instance creation**: provide the command *Create instance*, and one command per schema declared with a command name.

## Custom checkers

- [ ] **Custom checkers**: embed the runner script in the bundle, start the Python process with the interpreter of the settings, and exchange one JSON message per line.
- [ ] **Custom checkers**: register the checker modules and their names in the settings tab.
- [ ] **Custom checkers**: bound each call by a timeout, discard stale results, and provide the command *Restart Python checkers*.

## Schema editor

- [ ] **Schema editor**: decide how an instance records the version of its schema: a versioned schema file named by the modeline, or a data field fixed by the keyword `const`.
- [ ] **Schema editor**: write the meta-schema of the schema dialect.
- [ ] **Schema editor**: provide the command *Create schema*, and the preview panel of the form under edit.

## Release

- [ ] **Tooling**: replace the example vault by schemas with keywords of ekphrasis, and by instances bound to them.
- [ ] **Tooling**: publish releases through a workflow that attaches the plugin bundle, the manifest and the style sheet.
- [ ] **Tooling**: review the documentation against the code, and update the changelog.
