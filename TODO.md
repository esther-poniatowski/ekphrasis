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
- [x] **Form view**: display the title of the box of issues in the colour of errors, as the title of the box of schema defects takes the colour of its edge. (2026-10-20)
- [x] **Form view**: in the box of issues and the box of schema defects, align the start of each message after the longest field name. (2026-10-20)
- [x] **Form view**: in the message of a file bound to no schema, replace the word *ways*, and place the line of the modeline after the words *at the top of the file*. (2026-10-20)

## Collections

- [x] **Field kinds**: display one control per collection kind, including the tables and the alternatives. (2026-10-20)
- [x] **Form view**: give each item of a sequence an identifier kept across reorderings. (2026-10-20)
- [x] **Saving**: implement the insertion and removal of entries inside a flow collection with their separating commas, keeping the flow form, as the user decided on 2026-10-20. (2026-10-20)
- [x] **Saving**: insert, remove and reorder items and rows with the indentation of their siblings. (2026-10-20)
- [x] **Form view**: collapse and expand groups and collections, following the keyword `x-collapsed` when the form opens, and provide the commands *Collapse all* and *Expand all*. (2026-10-20)
- [x] **Form view**: draw a vertical guide along each nested group, so that each field reads as part of its group. (2026-10-20)
- [x] **Saving**: write a new collection under a block mapping in flow form when every sibling holding the same key writes it in flow form. (2026-10-20)
- [x] **Field kinds**: remove the keys of the previous alternative when another alternative is chosen, after a confirmation when one of them holds a filled value. (2026-10-20)
- [ ] **Schemas**: decide whether an invalid or misplaced `x-list-layout` is reported as a schema defect or ignored.
- [ ] **Field kinds**: implement compact and expanded controls for `list`, selected initially by `x-list-layout` with `compact` as its default. Keep a manual choice until the view closes or displays another file. Changing the layout must not edit the YAML file.

## Guidance and navigation

- [x] **Saving**: write a new scalar value in the quoting style of its siblings when they all share one quoted style that represents the value. (2026-10-20)
- [x] **Tooling**: write the scenario records of the manual tests with empty values as unfilled values, drop `x-unfilled: [open]` from their schemas, and update the expected results of the protocols still to run. (2026-10-20)
- [x] **Form view**: keep a pane in the source view when another file opens in it. (2026-10-22)
- [x] **Form view**: display the instructions and the examples of a field on demand. (2026-10-22)
- [x] **Form view**: render the values of kind `markdown-line`, `markdown` and `latex` through the renderers of Obsidian. (2026-10-22)
- [x] **Form view**: render first the fields that enter the visible area of a long instance, in batches that yield to input between them. (2026-10-22)
- [x] **Form view**: display the keys outside the schema in a read-only area. (2026-10-20: implemented by the milestone *Bound form*, and checked by its protocol and by the protocol of validation)
- [x] **Outline**: display the entries of the active instance, and move the form to the field of a clicked entry. (2026-10-22)
- [x] **Outline**: mark the entries with issues, and restrict the outline to them on demand. (2026-10-22)
- [x] **Form view**: display the counts of the summary at the top of the form as a list, one line per kind of issue, with the fields of each kind reachable from it. (2026-10-22)
- [x] **Outline**: provide a search that moves the form to a field, and displays its instructions. (2026-10-22)

## Corrections after the check of Guidance and navigation

- [x] **Outline**: add a button clearing the search field, marked by a cross. (2026-10-23)
- [x] **Form view**: add buttons folding and unfolding every section, in the header of the form view and at the top of the outline, beside the commands *Collapse all* and *Expand all*. (2026-10-23)
- [x] **Form view**: separate the information icon of the title of the form from its last letter. (2026-10-23)
- [x] **Field kinds**: read the keyword `x-align`, `left` or `center`, on a field of kind `latex` and on a column of a table, with `center` as default. (2026-10-23)
- [x] **Form view**: verify that `Enter` and `Space` open the instructions of a focused help button. (2026-10-23)
- [x] **Form view**: provide a command and a button showing or hiding the instructions of every field at once, independently of the folding of sections. (2026-10-23: implemented; awaits the check of the [protocol of links](tests/manual/protocols/links.md) inside Obsidian)

## Links

- [x] **Links**: decide, in a decision record, the location of the index of identifiers (a module of ekphrasis or a separate plugin), the syntax of a link by identifier, and the declaration of the identifier of a record type. Accepted by the user on 2026-10-23, in the [decision on record identifiers](docs/adr/record-identifiers.md). (2026-10-23)
- [x] **Links**: confirm in a test vault how Obsidian passes the subpath of a followed link to the view of a YAML file, which paths of a YAML file it resolves, and whether a plugin can suggest field paths after a hash sign. Verdicts recorded in the [implementation plan](docs/architecture/implementation-plan.md). (2026-10-23)
- [ ] **Links**: verify that the Markdown links and the wikilinks of a value resolve as in a note stored in the folder of the instance, including relative paths, encoded spaces and subpaths of notes, and that an external link such as `https://…` opens in the browser.
- [x] **Links**: parse field links by path, and open the target instance in the form view at the designated field, from a value of a form and from a note. (2026-10-23: implemented; awaits the check of the [protocol of links](tests/manual/protocols/links.md) inside Obsidian)
- [x] **Links**: suggest the field paths of an instance after a hash sign in a link. (2026-10-23: implemented; awaits the check of the [protocol of links](tests/manual/protocols/links.md) inside Obsidian)
- [x] **Links**: provide the command *Copy link to field*, in the link format set in the settings of Obsidian. (2026-10-23: implemented; awaits the check of the [protocol of links](tests/manual/protocols/links.md) inside Obsidian)
- [x] **Links**: index the identifiers of the records of the vault, and resolve the field links by identifier. (2026-10-23: implemented; awaits the check of the [protocol of links](tests/manual/protocols/links.md) inside Obsidian)

## Metadata

- [ ] **Metadata**: decide the default of the setting *Metadata field*, and whether the keys of the metadata block also appear in the outline and in the summary of issues.
- [ ] **Metadata**: confirm in a test vault whether a plugin can add the aliases of YAML instances to the link suggestions of Obsidian, or must provide a suggestion of its own.
- [ ] **Metadata**: read the setting *Metadata field* and the keyword `x-metadata`, and display the metadata block as a foldable panel of properties above the form, shown or hidden by a setting.
- [ ] **Metadata**: suggest the aliases of instances in links, and fill the display text of a link inserted from an alias.
- [ ] **Metadata**: render and resolve the links of the metadata block as the links of the properties of a note.

## Tags

- [ ] **Tags**: decide which values may carry tags written as `#tag` (values of kind `markdown-line` and `markdown` only, or every string), whether the tree also lists the tags of notes, and the syntax of the search, for instance the syntax of the search of Obsidian.
- [ ] **Tags**: confirm in a test vault whether the tag pane and the search of Obsidian list any tag of a YAML file.
- [ ] **Tags**: collect the tags of each instance from its metadata block and from its values, and nest them by their slashes.
- [ ] **Tags**: display the tree of tags in a side panel, with the number of files of each tag, and open the files of a tag.
- [ ] **Tags**: browse the tags by a search that combines and excludes tags.

## Images

- [ ] **Images**: decide the name of the kind of a field holding an image, the form of its value (a path from the vault root, a path from the instance, or an embed such as `![[diagram.svg]]`), and the formats admitted.
- [ ] **Images**: verify that an image embedded in a value of kind `markdown-line` or `markdown`, as `![[diagram.svg]]` or `![diagram](diagram.png)`, displays in the rendered value, for SVG and PNG files.
- [ ] **Images**: display the image held by a field, and provide a control choosing another image file of the vault.

## Instance creation

- [ ] **Tooling**: measure the time per file of the corpus tests on geonexus, which grew from about 2 minutes on 2026-10-02 to 41 minutes on 2026-10-20, find the cause, and correct it or record the remaining cost.
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
