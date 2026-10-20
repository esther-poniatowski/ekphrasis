# Roadmap

The roadmap of ekphrasis lists the steps of each milestone of the [implementation plan](docs/architecture/implementation-plan.md), with the state of each step. Each step opens with the [feature](docs/features/_index.md) that it implements, and each completed step carries the date of its check. Within each milestone, a step follows the steps that it relies on.

## Toolchain and spikes

- [x] **Tooling**: commit a lock file, so that `npm ci` passes in continuous integration. (2026-10-01)
- [x] **Tooling**: add `preact`, compile JSX with the import source `preact`, cover the files `.tsx` in the TypeScript, ESLint and Vitest configurations, and forbid `preact` outside the adapters layer. (2026-10-01)
- [x] **Tooling**: retire the reading view, the Markdown projection and the code block `yaml-view`, and keep the parser adapter that reports source ranges. (2026-10-01)
- [x] **YAML instances**: confirm in a test vault how Obsidian behaves when another enabled plugin registers the extension `.yaml` or `.yml`. (2026-10-01)
- [x] **Validation**: confirm that Ajv compiles a schema with keywords prefixed `x-` inside Obsidian. (2026-10-01)
- [x] **Saving**: confirm on the fixtures that a splice through the syntax tree of the `yaml` library preserves every untouched byte. (2026-10-01)
- [x] **Form view**: measure the rendering of one hundred Markdown values and one hundred formulas in one view. (2026-10-01)
- [x] **Custom checkers**: confirm that a desktop plugin starts a Python process, exchanges one message, and stops the process when the vault closes. (2026-10-01)
- [x] **Tooling**: write the fixtures reproducing the constructs of the consumer projects, and the optional corpus test reading their records. (2026-10-01)

## Bound form

- [x] **YAML instances**: register the extensions `.yaml` and `.yml` for the view of ekphrasis, and open a file bound to no schema in the source view. (2026-10-01)
- [x] **YAML instances**: catch a registration refused because another plugin owns the extension, report it in a notice, and provide the command *Open in ekphrasis*. (2026-10-01)
- [x] **YAML instances**: resolve the schema of an instance from its modeline, and else from the path rules of the settings. (2026-10-01)
- [x] **Schemas**: load schemas written in JSON or in YAML, and resolve the keyword `$ref` across files. (2026-10-01)
- [x] **Field kinds**: derive the kind of each field from the keyword `x-kind`, and else from the standard keywords. (2026-10-01)
- [x] **Form view**: build the form model from the schema and the parsed instance. (2026-10-01)
- [x] **Form view**: display one control per scalar kind. (2026-10-01)
- [x] **Form view**: bundle a YAML language mode, exclude it from the external packages of the bundler, and host the source view in the view of ekphrasis. (2026-10-01)
- [x] **Form view**: switch between the form view and the source view, by a header button and a command. (2026-10-01)

## Saving of scalars

- [x] **Saving**: commit a control when it loses the focus, when typing pauses for the delay of the settings, and at each change of a dropdown, a toggle or a checkbox. (2026-10-13)
- [x] **Saving**: splice the text of a committed value into the source range of its node, and confirm the committed value by parsing the new text. (2026-10-13)
- [x] **Saving**: select the scalar style of each new or edited value. (2026-10-13)
- [x] **Saving**: insert the key of an absent optional field at its first edit, with the indentation of its siblings. (2026-10-13)
- [x] **Saving**: remove the key of a cleared optional field, and write the unfilled value of a cleared required field. (2026-10-13)
- [x] **Saving**: parse the file again after a change made outside, and keep the text of the focused control. (2026-10-13)

## Validation

- [x] **Validation**: report unfilled required fields as missing before any other check. (2026-10-13)
- [x] **Validation**: validate instances with a JSON Schema validator for draft 2020-12 that accepts the keywords prefixed `x-`, and convert its error locations into field paths. (2026-10-13)
- [x] **Validation**: implement the predefined checkers, and resolve the relative field paths of relational and conditional rules. (2026-10-13)
- [x] **Validation**: evaluate predefined checkers for the rule families shared by the consumer projects (references across files, uniqueness, acyclicity), declared in the schema, so that custom checkers serve project-specific rules only. Decided after the [evaluation](docs/architecture/implementation-plan.md): these rules run as custom checkers, and no milestone of their own is added. (2026-10-19)
- [x] **Validation**: display the issues at their fields and in the headings of the groups containing them. (2026-10-19)
- [x] **Validation**: provide the command *Validate instance*. (2026-10-19)

## Corrections after the check of Validation

- [x] **Form view**: reproduce by a test, then correct, the options of a dropdown displayed twice after its value changes. No defect existed: the observation had confused distinct options, *Modal knowledge* with *Model knowledge* and *Exploration* with *Explanation*, as the [protocol of the corrections](tests/manual/protocols/corrections-validation.md) records. (2026-10-20)
- [x] **Validation**: report as a schema defect each property required by the keyword `required` or by a condition but absent from the properties of the schema, naming that property. (2026-10-19)
- [x] **Form view**: display every unfilled value as an empty control marked `—`, whatever value the file holds, and warn when a schema declares as unfilled a value that it admits for a field. (2026-10-20)
- [x] **Form view**: reflect the conditional rules in the controls: disable a field forbidden by the current values, and mark as required a field required by them. (2026-10-20)
- [x] **Form view**: lay out the message of a file bound to no schema as a heading followed by the list of the two ways of binding it. (2026-10-20)
- [x] **Saving**: write the value of a single-line kind in plain style, or single-quoted when the plain style misreads it, even when the previous value was a block scalar. (2026-10-19)
- [x] **Form view**: test in the simulated DOM that a dropdown lists each admitted value once, after successive changes of its value. (2026-10-20)
- [x] **Form view**: write the title of the box of issues as a list of counts, without the conjunction and the final period, as in `Validation: 3 missing fields, 9 invalid values, 1 warning`. (2026-10-20)
- [ ] **Form view**: display the title of the box of issues in the colour of errors, as the title of the box of schema defects takes the colour of its edge.
- [ ] **Form view**: in the box of issues and the box of schema defects, align the start of each message after the longest field name.
- [x] **Form view**: in the message of a file bound to no schema, replace the word *ways*, and place the line of the modeline after the words *at the top of the file*. (2026-10-20)

## Collections

- [ ] **Field kinds**: display one control per collection kind, including the tables and the alternatives.
- [x] **Form view**: give each item of a sequence an identifier kept across reorderings. (2026-10-20)
- [x] **Saving**: implement the insertion and removal of entries inside a flow collection with their separating commas, keeping the flow form, as the user decided on 2026-10-20. (2026-10-20)
- [x] **Saving**: insert, remove and reorder items and rows with the indentation of their siblings. (2026-10-20)
- [ ] **Form view**: collapse and expand groups and collections, following the keyword `x-collapsed` when the form opens, and provide the commands *Collapse all* and *Expand all*.
- [ ] **Form view**: draw a vertical guide along each nested group, so that each field reads as part of its group.
- [ ] **Saving**: write a new collection under a block mapping in flow form when every sibling holding the same key writes it in flow form.
- [ ] **Field kinds**: remove the keys of the previous alternative when another alternative is chosen, after a confirmation when one of them holds a filled value.

## Guidance and navigation

- [ ] **Form view**: display the instructions and the examples of a field on demand.
- [ ] **Form view**: render the values of kind `markdown-line`, `markdown` and `latex` through the renderers of Obsidian.
- [ ] **Form view**: render first the fields that enter the visible area of a long instance, in batches that yield to input between them.
- [ ] **Form view**: display the keys outside the schema in a read-only area.
- [ ] **Outline**: display the entries of the active instance, and move the form to the field of a clicked entry.
- [ ] **Outline**: mark the entries with issues, and restrict the outline to them on demand.
- [ ] **Form view**: display the counts of the summary at the top of the form as a list, one line per kind of issue, with the fields of each kind reachable from it.
- [ ] **Outline**: provide a search that moves the form to a field, and displays its instructions.

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
