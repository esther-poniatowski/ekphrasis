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
- [x] **Form view**: provide a command and a button showing or hiding the instructions of every field at once, independently of the folding of sections. (2026-10-29)

## Links

- [x] **Links**: decide, in a decision record, the location of the index of identifiers (a module of ekphrasis or a separate plugin), the syntax of a link by identifier, and the declaration of the identifier of a record type. Accepted by the user on 2026-10-23, in the [decision on record identifiers](docs/adr/record-identifiers.md). (2026-10-23)
- [x] **Links**: confirm in a test vault how Obsidian passes the subpath of a followed link to the view of a YAML file, which paths of a YAML file it resolves, and whether a plugin can suggest field paths after a hash sign. Verdicts recorded in the [implementation plan](docs/architecture/implementation-plan.md). (2026-10-23)
- [x] **Links**: verify that the Markdown links and the wikilinks of a value resolve as in a note stored in the folder of the instance, including relative paths, encoded spaces and subpaths of notes, and that an external link such as `https://…` opens in the browser. (2026-10-29)
- [x] **Links**: parse field links by path, and open the target instance in the form view at the designated field, from a value of a form and from a note. (2026-10-29)
- [x] **Links**: suggest the field paths of an instance after a hash sign in a link. (2026-10-29)
- [x] **Links**: provide the command *Copy link to field*, in the link format set in the settings of Obsidian. (2026-10-29)
- [x] **Links**: index the identifiers of the records of the vault, and resolve the field links by identifier. (2026-10-29)

## Schema registry

- [x] **Schema registry**: bind a record by its top-level field `_schema`, resolved through the registry named by the setting *Schema registry*, before the modeline and the path rules, and omit `_schema` from the form. (2026-10-29)
- [x] **Schema registry**: make the directory admitted for low-level reads of generated schema resources configurable per vault, with `.schema-resources` as the compatibility default. (2026-11-10)
- [x] **Form view**: honor `readOnly: true` in any applicable composed schema layer, inherit the lock through descendants, refuse commits below it and test generated Gnomon views without copying them into Ekphrasis. (2026-11-10)
- [ ] **Schema registry**: resolve a `$ref` by absolute URI through the key `resources` of a registry of version 2, as the [decision on absolute references](docs/adr/absolute-references.md) proposes, and confirm it inside Obsidian on a base schema held in the configured schema resource directory.
- [ ] **Schema registry**: merge the subschemas composed by `allOf` into the form and read the root keywords through them, as the [decision on schema composition](docs/adr/schema-composition.md) proposes, and confirm it inside Obsidian on a consumer root schema.

## Form presentation

- [x] **Form view**: keep an absent optional property out of the form until the author selects it, then display a source-free draft written by its first commit. (2026-11-10)
- [x] **Form view**: reveal an absent optional property when a current condition or missing-field issue requires it, and hide it again only while it remains uncommitted. (2026-11-10)
- [x] **Form view**: display each field as a row, as Obsidian displays the properties of a note: an icon of its kind at the left, its name in bold, and its control in the remaining width. (2026-10-30)
- [x] **Form view**: give every text control one font size, the smallest used now, and one appearance: a white fill, a gray border and rounded corners. (2026-10-30)
- [x] **Form view**: draw the arrow of a dropdown without shifting the control, align the help button of a field at the right of its label, and separate the help buttons of the headers of a table from their names. (2026-10-30)
- [x] **Form view**: show the descriptions of the options of a choice on demand, with the instructions of the field, instead of always. (2026-10-30)
- [x] **Form view**: remove the messages *No items* and *No rows*, since the button adding an item already states that the collection is empty. (2026-10-30)
- [x] **Form view**: lighten the vertical guide drawn along each nested group. (2026-10-30)
- [x] **Form view**: decide how a long value of a single-line text control stays editable: wrapped onto several lines, as the user decided on 2026-10-30. (2026-10-30)
- [x] **Form view**: wrap a long value of the kinds `text`, `markdown-line` and `latex` onto several lines, keeping a single-line value on one line in the file, as the specification of [field kinds](docs/features/field-kinds.md) states. (2026-10-30)
- [x] **Outline**: open the outline in the right sidebar at the first load of the plugin, so that its icon sits beside the outline and the backlinks of Obsidian, and keep it following the active form without running the command *Show outline*. (2026-10-30)
- [x] **Outline**: adopt the style of the outline of Obsidian. (2026-10-30)
- [x] **Outline**: omit the items of a list of scalars from the outline. (2026-10-30)

## Corrections after the check of Form presentation

- [x] **Form view**: align the descriptions of the options listed in the instructions of a field on one column, as the messages of the issues of a field are aligned. (2026-10-30)
- [x] **Form view**: draw the chevron of a group or a collection outside the column of icons, so that its icon and its name align with those of the fields at the same depth. (2026-10-30)
- [x] **Form view**: align the help button of a group or a collection with the help buttons of the scalar fields at the same depth. (2026-10-30)
- [x] **Form view**: remove the horizontal line under the heading of a group or a collection, and keep only the vertical guide along its fields. (2026-10-30)
- [x] **Form view**: undo the last edit of a text control with `Cmd+Z`. (2026-11-09)

## Schema styles

- [ ] **Schema styles**: decide, in a decision record, where the presentation of the forms of a schema is declared apart from the schema, the format of that declaration and its binding to the schema, and which presentation keywords of the schema it takes over among `x-collapsed`, `x-align`, `x-list-layout` and `x-image-width`.
- [ ] **Schema styles**: apply the style of a schema: the width of each field and column by the presets `compact`, `normal` and `wide`, the icon of each field, and the placement of a control below its label.
- [ ] **Schema styles**: let the style name the caption of an alternative, in place of the caption *Alternative*.

## Metadata

- [x] **Metadata**: decide the default of the setting *Metadata field*, and whether the keys of the metadata block also appear in the outline and in the summary of issues. Decided by the user on 2026-10-29, as the specification of the milestone records. (2026-10-29)
- [ ] **Metadata**: confirm in a test vault whether a plugin can add the aliases of YAML instances to the link suggestions of Obsidian, or must provide a suggestion of its own.
- [ ] **Metadata**: read the setting *Metadata field* and the keyword `x-metadata`, and display the metadata block as a foldable panel of properties above the form, shown or hidden by a setting.
- [ ] **Metadata**: suggest the aliases of instances in links, and fill the display text of a link inserted from an alias.
- [ ] **Metadata**: render and resolve the links of the metadata block as the links of the properties of a note.
- [ ] **Metadata**: display the schema of the record as a clickable link to its file, with the version of the schema beside it, apart from the fields of the content.

## Field kinds

- [ ] **Field kinds**: decide the name, the form of the value and the control of each kind below, and whether a standard keyword such as `format: email` or `format: uri` derives it.
- [ ] **Field kinds**: add a kind of internal link holding a display text and a path, edited as two inputs and displayed as a link.
- [ ] **Field kinds**: add kinds of web address, email address and telephone number, each displayed as a link opening its application, such as the address `someone@example.org` opening the mail application.
- [ ] **Field kinds**: add a kind of task, a checkbox with its text.

## Dates

- [ ] **Dates**: decide the form of the value of each variant (calendar date, partial date of a year or of a year and a month, range, date relative to an event, each with an optional time), and whether a value keeps the objects of the temporal schema of geonexus or becomes a string in ISO 8601.
- [ ] **Dates**: provide the control of each variant, with a placeholder giving its expected format, and dropdowns of the year and the month or a calendar.
- [ ] **Dates**: validate each variant, including the order of the two dates of a range.

## Tags

- [x] **Tags**: decide which values may carry tags written as `#tag` (values of kind `markdown-line` and `markdown` only, or every string), whether the tree also lists the tags of notes, and the syntax of the search, for instance the syntax of the search of Obsidian. Decided by the user on 2026-10-29, as the specification of the milestone records. (2026-10-29)
- [ ] **Tags**: confirm in a test vault whether the tag pane and the search of Obsidian list any tag of a YAML file.
- [ ] **Tags**: collect the tags of each instance from its metadata block and from its values, and nest them by their slashes.
- [ ] **Tags**: display the tree of tags in a side panel, with the number of files of each tag, and open the files of a tag.
- [ ] **Tags**: browse the tags by a search that combines and excludes tags.

## Images

- [x] **Images**: decide the name of the kind of a field holding an image, the form of its value (a path from the vault root, a path from the instance, or an embed such as `![[diagram.svg]]`), and the formats admitted. Decided by the user on 2026-10-29: the kind `image`, a path from the folder of the instance, and the formats SVG, PNG, JPEG, GIF and WebP. (2026-10-29)
- [x] **Images**: decide how the size or the scale of an image is set: by a keyword of the schema fixing the width of the field, by a size written with the value, or by a zoom control of the form that the file does not keep. Decided by the user on 2026-10-29: the keyword `x-image-width` of the field, overridden by a value written as a mapping `{path, width}`. (2026-10-29)
- [ ] **Images**: verify that an image embedded in a value of kind `markdown-line` or `markdown`, as `![[diagram.svg]]` or `![diagram](diagram.png)`, displays in the rendered value, for SVG and PNG files.
- [ ] **Images**: display the image held by a field at the width set by `x-image-width` or by its value, and provide a control choosing another image file of the vault.

## List editing

- [ ] **Schemas**: decide whether an invalid or misplaced `x-list-layout` is reported as a schema defect or ignored.
- [ ] **Field kinds**: implement compact and expanded controls for `list`, selected initially by `x-list-layout` with `compact` as its default. Keep a manual choice until the view closes or displays another file. Changing the layout must not edit the YAML file.
- [x] **Field kinds**: display a list of scalars in a table cell as one summary of its items, which opens the control of the list in an editable cell and offers no control in a read-only one. (2026-11-10)
- [x] **Field kinds**: display literal identifiers and inline formulas in read-only table cells, and keep large tables navigable through a keyboard-focusable scrolling region with sticky headings. Synthetic and Gnomon corpus tests pass, and the 79-row expression view passed in Obsidian. (2026-11-11)
- [x] **Field kinds**: display a read-only tree from producer-ordered nodes and the generic property roles declared by `x-tree-role`, without field names or hierarchy rules tied to a producer. Writable values retain the records editor. (2026-11-11)
- [x] **Field kinds**: display a read-only directed graph from generic roles declared by `x-graph-role`. The producer supplies semantic captions, shapes, markers, roots, status axes and edges. Ekphrasis supplies scrolling, zoom, immediate-relation focus and complete-route tracing. Synthetic and current Gnomon corpus tests pass. (2026-11-11)
- [x] **Field kinds**: consume a versioned graph-presentation profile through the generic `presentation` role. Safe Lucide identifiers, display titles, semantic style tokens, relation layers and layout compatibility override the retained per-node fallbacks without adding producer vocabulary to Ekphrasis. (2026-11-12)
- [x] **Field kinds**: filter a graph by its generic relation layers, report visible and hidden edge counts, and preserve the projection and selected node across layouts. Synthetic and current Gnomon corpus tests pass; the two-layer Gnomon graph passed inside Obsidian. (2026-11-12)
- [x] **Field kinds**: filter graph nodes by generic category, kind, activity-family and status facets. Values combine by OR within a facet and AND across facets; node filtering constrains edges and route tracing, reports visible and hidden counts, and persists across layouts. Synthetic and current Gnomon corpus tests pass; the four-facet Gnomon menu passed inside Obsidian. (2026-11-12)
- [x] **Field kinds**: filter graph edges by their individual kinds, in addition to their broad relation layers. The two groups combine by intersection, constrain route tracing, report projection counts and persist across layouts. Synthetic and current Gnomon corpus tests pass; the Gnomon relation-kind menu passed inside Obsidian. (2026-11-12)
- [x] **Field kinds**: orient the layered directed graph from top to bottom, so successive stages occupy chronological rows and parallel branches occupy neighboring columns. The force-directed network remains orientation-neutral. Layout and component tests pass; the Gnomon inquiry route passed inside Obsidian. (2026-11-12)
- [x] **Field kinds**: traverse visible graph cards from one Tab stop. Arrow keys prioritize incident relations in their direction and otherwise use spatial fallback; Home and End reach the reading-order boundaries, and a live region announces each traversed relation. Synthetic tests and the Gnomon inquiry route pass inside Obsidian. (2026-11-12)
- [x] **Field kinds**: resolve graph layouts through a renderer-owned strategy registry. Each strategy declares its required graph structure, placement algorithm, edge routing and interaction capabilities. The *Layout* selector admits only compatible registered strategies. The condensed map uses typed points, short labels and directed unlabelled edges. Synthetic tests, the current Gnomon corpus and all three layouts pass inside Obsidian. (2026-11-13)
- [ ] **Field kinds**: once the compact layout exists, decide whether a list in a table cell is edited in place through it, instead of through the control opened below its summary.
- [ ] **Field kinds**: insert an item at the top of a list or between two items, and not only at its end.
- [ ] **Field kinds**: reorder the items of a list by dragging them.
- [ ] **Field kinds**: decide the ordering modes of a list (lexical, chronological, custom, each reversible), and whether a mode is declared for the field and kept at each edit or applied once by a command, then implement them.

## Conditional fields

- [ ] **Conditional fields**: decide which constructs select the subfields displayed by the value of a field (`if` with `then` and `else`, `dependentSchemas`, a `oneOf` whose alternatives differ by a constant), and what happens to the filled subfields that a new value excludes.
- [ ] **Conditional fields**: display only the subfields that the current values admit, and update them when a value changes.

## Instance creation

- [ ] **Tooling**: measure the time per file of the corpus tests on geonexus, which grew from about 2 minutes on 2026-10-02 to 41 minutes on 2026-10-20, find the cause, and correct it or record the remaining cost.
- [x] **Instance creation**: create a new record from a writable contract in the configured registry, retain its logical binding in `_schema`, refuse an existing path, and open its form. Synthetic tests and the read-only Gnomon corpus test pass. (2026-11-10)
- [x] **Instance creation**: run the creation protocol inside Obsidian. (2026-11-10)
- [x] **Instance creation**: invoke an optional producer-owned command after generic creation, with the new path and schema as generic placeholders. Preserve and open the created record when the follow-up fails, and retry that follow-up without creating the record again. Synthetic process and application tests pass; the Gnomon registration and failure-recovery routes passed inside Obsidian. (2026-11-11)
- [ ] **Instance creation**: define how a registry marks the current creatable contract, then make the chooser prioritize that contract without hiding an older version selected deliberately.
- [ ] **Instance creation**: write the skeleton of a new instance, with its modeline when no path rule binds its path.
- [ ] **Instance creation**: add the schema folder to the settings, and offer its schemas together with those of the path rules.
- [ ] **Instance creation**: provide the command *Create instance*, and one command per schema declared with a command name.

## Custom checkers

- [x] **Custom checkers**: embed the runner script in the bundle, start the Python process with the interpreter stored by the plugin, and exchange one JSON message per line. (2026-11-10)
- [x] **Custom checkers**: register the checker modules and their names in the settings tab. (2026-11-10)
- [x] **Custom checkers**: invoke each registered checker declared by a schema after the built-in checks, discard results computed for superseded source text, and merge current issues into the validation report. (2026-11-10)
- [x] **Custom checkers**: bound each call by a timeout, discard stale results, and provide the command *Restart Python checkers*. (2026-11-10)
- [x] **Custom checkers**: select an instance checker by schema identifier and run it without requiring the consumer schema to name that checker. (2026-11-10)
- [x] **Custom checkers**: invoke a configured command through the findings-log adapter and preserve the metadata of its machine-readable report. (2026-11-10)
- [x] **Custom checkers**: display selected SARIF run context above the findings without counting it as an issue; verify the current Gnomon completion target in Obsidian. (2026-11-10)
- [x] **Custom checkers**: compare a generated file's stored source state with one producer command, display a current-state context or a stale warning, and reproduce no producer hashing logic. Synthetic rendering, current Gnomon views and the desktop Obsidian protocol pass. (2026-11-11)
- [x] **Generated views**: accept an explicit completion target, run a configured producer command and open the generated YAML path returned by that producer. The runtime contains no target-to-view mapping or consumer-project path. (2026-11-11)
- [x] **Generated views**: run the primary-view protocol in desktop Obsidian, including two targets and a refused path outside the vault. (2026-11-11)
- [x] **Validation**: combine a finding's pointer and discriminator, display a real Gnomon issue at its nested field, and focus that field from the validation summary. (2026-11-10)
- [x] **Validation**: group dependent findings under the field whose authored value or presence activates them, preserve the ordinary report, and route both the controlling field and each repair target. Synthetic tests, the current Gnomon corpus and the desktop Obsidian protocol pass. (2026-11-10)
- [x] **Validation**: present controlling groups before the ordinary report, order dependent and remaining findings as missing, invalid and warning, and preserve checker order within one mark. The adversarial component test, current Gnomon corpus and desktop Obsidian protocol pass. (2026-11-10)
- [x] **Validation**: display Gnomon's bounded clean-result context when a completed check returns no error or warning, without inferring that meaning from an empty issue list. Adapter, component, current Gnomon-corpus and desktop Obsidian checks pass. (2026-11-10)
- [x] **Validation**: present a schema-declared admitted value as unresolved research state, apart from missing, invalid and warning findings, and route its summary to the exact field. Synthetic tests, the current Gnomon corpus and the desktop Obsidian protocol pass. (2026-11-10)
- [x] **Tooling**: implement the read-only command and settings button *Diagnose setup*, with checks of the schema route, the active record and the configured custom checkers. (2026-11-10)
- [ ] **Tooling**: finish the setup-diagnostic protocol inside Obsidian. The basic desktop report route passes; the combined-failure, configured-checker and mobile sections remain open.
- [x] **Custom checkers**: implement the macOS and Linux process-group stop for a configured findings command after a timeout, restart or forced close; verify every trigger and recovery on macOS. (2026-11-10)
- [x] **Tooling**: lower lazy imports of Node built-ins to lazy CommonJS loads, so desktop checker and diagnostic processes start inside Obsidian while each load remains inside its desktop-only path. (2026-11-10)
- [ ] **Custom checkers**: run the forced-stop integration on Linux; handle a non-zero Windows `taskkill` exit through a tested fallback that lets the runner's close finish, then run the integration on Windows.
- [ ] **Tooling**: stop every process tree started by `runCommand` or `callChecker` across the outer TypeScript timeout and the embedded Python command timeout of the setup diagnostic; await termination and test descendants.
- [ ] **Custom checkers**: discard a queued checker call before it starts when newer source text supersedes its request.
- [ ] **Validation**: verify on mobile that the applicable checker message remains visible; the desktop protocol now covers the controller and repair-target summary links.
- [ ] **Custom kinds**: deferred on 2026-11-10. Gnomon already uses the existing controls and renderings, and project-specific rules run through custom checkers. Reconsider this extension after the integrated Gnomon workflow is usable by a new researcher.

## Schema editor

- [ ] **Schema editor**: decide how an instance records the version of its schema: a versioned schema file named by the modeline, or a data field fixed by the keyword `const`.
- [ ] **Schema editor**: write the meta-schema of the schema dialect.
- [ ] **Schema editor**: provide the command *Create schema*, and the preview panel of the form under edit.

## Release

- [ ] **Tooling**: replace the example vault by schemas with keywords of ekphrasis, and by instances bound to them.
- [ ] **Tooling**: publish releases through a workflow that attaches the plugin bundle, the manifest and the style sheet.
- [ ] **Tooling**: review the documentation against the code, and update the changelog.
