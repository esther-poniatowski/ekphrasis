---
tags:
  - architecture
index: "[Architecture](docs/architecture/_index.md)"
aliases:
  - Implementation plan
---
# Implementation plan

The implementation plan orders the construction of ekphrasis into twenty milestones, from the toolchain to the schema editor. Each milestone delivers a form usable in a vault, so that every later milestone extends a working plugin. The steps of each milestone, with their state, are listed once in the [roadmap](../../TODO.md). This note fixes the goal of each milestone, the modules it creates, its exit criterion and the risks it must resolve.

> [!TIP] Ordering rule
> A milestone precedes another when the second depends on its modules, or when it tests a premise on which the second depends. Among independent milestones, the milestone whose failure would change the most decisions comes first.

## Principles

Four principles govern every milestone:

- **Premises before features**: each premise about Obsidian or a library that a decision record states without verification is tested by a spike in the first milestone. The result of each spike updates the status of its decision record, from proposed to accepted, or reopens the decision.
- **Domain first**: within a milestone, the domain modules are written and tested before the adapters that display them, following the [layers and dependency rule](layers.md).
- **Two consumer projects as acceptance tests**: a milestone is complete when the records of the two consumer projects, gnomon and geonexus, behave as specified. The test suite reproduces their constructs in synthetic fixtures, and an optional corpus test reads their records from a folder named by an environment variable.
- **Byte preservation as a regression test**: from the second milestone onward, a golden test edits each field of each fixture and compares every untouched byte of the file.

## Module layout

The [form pipeline](form-pipeline.md) fixes the stages, and the folders below place each stage in its layer:

| Layer | Folder | Modules |
| --- | --- | --- |
| Domain | `src/domain/form/` | Form model, field kinds and their derivation, identifiers of sequence items |
| Domain | `src/domain/schema/` | Interpretation of a JSON Schema object: properties, required fields, conditions, keywords prefixed `x-`; schema documents prepared for the validator |
| Domain | `src/domain/paths/` | Parser and printer of field paths |
| Domain | `src/domain/validation/` | Issues and their placement, unfilled values, conversion of the errors of the validator to field paths, predefined checkers, expansion of the relative paths of rules |
| Domain | `src/domain/edit/` | Scalar styles, text of an edited node, text edits for insertions and removals, skeleton of a new instance |
| Domain | `src/domain/binding/` | Reading of the modeline, glob matching of path rules, resolution of the schema of an instance |
| Domain | `src/domain/files/` | Vault paths, and resolution of the relative paths written in modelines and in `$ref` |
| Domain | `src/domain/links/` | Parser and printer of field links, declaration and value of the identifier of a record, index of identifiers, completion of field paths in links |
| Application | `src/application/` | Ports, use cases (opening a form, committing an edit, creating an instance, validating in the order of checks), session of an open instance, settings |
| Infrastructure | `src/infrastructure/yaml/` | Parser with source ranges and tokens, writer of scalar texts, splice of text edits |
| Infrastructure | `src/infrastructure/schema/` | Loader of JSON and YAML schemas with resolution of `$ref`, JSON Schema validator |
| Infrastructure | `src/infrastructure/python/` | Python process, message protocol, embedded runner script |
| Adapters | `src/adapters/obsidian/views/` | Instance view hosting the form and the source view, outline view |
| Adapters | `src/adapters/obsidian/ui/` | Preact components: form root, one control per field kind, registry of controls |
| Adapters | `src/adapters/obsidian/` | Plugin class, commands, settings tab, vault access |

The instance view extends the `TextFileView` class of Obsidian, which holds the text of the file in memory and writes it back on request. Therefore, each commit replaces that text through the application layer, and requests a save. Obsidian loads a changed file into the same view, and this reload restarts the pipeline.

## Milestones

### Toolchain and spikes

**Goal.** A green continuous integration on a toolchain ready for Preact, and a verdict on each unverified premise.

**Modules.** The configuration files of TypeScript, ESLint, Vitest and esbuild, as the decision on the [form interface framework](../adr/form-interface-framework.md) lists. The renderer code of the earlier design is retired, and the parser adapter is kept.

**Spikes.** Each spike runs in a test vault or a unit test, and its verdict is recorded in the decision record named:

| Premise | Decision record | Test |
| --- | --- | --- |
| Behaviour of Obsidian when two plugins register `.yaml` | [Plain YAML instances](../adr/plain-yaml-instances.md) | Enable YAML Editor and ekphrasis together, and observe the error and the view opened |
| Ajv compiles a schema holding keywords prefixed `x-` inside Obsidian | [Schema dialect](../adr/json-schema-dialect.md) | Compile a schema of geonexus in the plugin, with `strictSchema` disabled |
| A splice preserves every untouched byte, comments included | [Source-preserving writes](../adr/source-preserving-writes.md) | Edit each scalar of the fixtures through the syntax tree of the `yaml` library, and compare the bytes |
| Rendering one hundred fields stays responsive | [Field rendering](../adr/field-rendering.md) | Render one hundred Markdown values and one hundred formulas in one view, and measure the time |
| A desktop plugin starts and stops a Python process | [Python checkers](../adr/python-checkers.md) | Start an interpreter through `child_process`, exchange one message, and close the vault |

**Exit criterion.** Continuous integration passes, including `npm ci` on a committed lock file, and each spike has a recorded verdict.

**Risk.** A negative verdict reopens its decision record before the milestone that depends on it.

### Bound form

**Goal.** A YAML file bound to a schema opens as a read-only form of scalar fields, and any other YAML file opens in the source view.

**Modules.** Binding, schema loader, interpretation of schemas, derivation of kinds, form model, instance view, source view with the YAML language mode, and the controls of the scalar kinds.

**Exit criterion.** Each record of the fixtures opens with the schema resolved from its modeline or from a path rule, and each scalar displays in the control of its kind.

### Saving of scalars

**Goal.** Each scalar field can be edited, and each commit changes only the edited value in the file.

**Modules.** Commit triggers, scalar styles, text of an edited node, splice and confirmation, cleared values, insertion of absent optional keys, reload after a change made outside.

**Exit criterion.** The golden test of byte preservation passes on every fixture, and the focused control keeps its text through a change made outside.

**Risk.** A splice alters neighbouring bytes most easily at a block scalar and at a value carrying a trailing comment, so the fixtures must hold both.

### Validation

**Goal.** Missing and invalid fields are highlighted after each commit.

**Modules.** Unfilled values, mapping of the errors of the validator to field paths, predefined checkers, relative paths of rules, display of issues, command *Validate instance*.

**Exit criterion.** The conditional rule of gnomon, in which the epistemic aim of a question decides the required fields, is expressed in a schema and reported correctly on the fixtures.

**Risk.** The validator reports locations as JSON Pointers, and an error on a missing property points to the parent object. Both must be converted to the field path of the missing field.

**Corrections.** The manual check of 2026-10-19 passed, and the observations of the user gave six corrections, listed in the [roadmap](../../TODO.md) and carried out before *Collections*: two defects, three changes of the presentation, and the plain style of single-line kinds.

**Evaluation of shared rule families.** The three families shared by the consumer projects reach beyond one instance:

- a reference of gnomon, such as `system.TOPIC#SYMBOL`, designates a symbol declared in another record;
- geonexus requires identifiers unique across the glossaries of a vault;
- acyclicity holds over the graph of such references.

Therefore, a predefined checker of these families must rely on an index of the vault, with four parts:

- a port that reads every instance bound to a schema;
- an index of the declared identifiers, kept current through the changes, renames and deletions of files;
- the invalidation of the issues of every instance that depends on a changed file;
- a validation that runs after the commit, since the index reads other files.

These four parts amount to a milestone. Moreover, such an index serves more than the forms, for instance backlinks between records, renames, or the check of a whole project outside Obsidian. Therefore, the maintainer decided on 2026-10-19 that the rules across files run as [custom checkers](../features/custom-checkers.md), and that no milestone of their own is added. Each project already implements these rules in Python, and a custom checker can read the files neighbouring its instance, so the form reuses those implementations. The checker `unique-by` covers uniqueness within one sequence. ^rules-across-files

The decision reopens when a field kind for references, suggesting the identifiers declared in other records, is adopted. Such a kind needs an index inside the form, and a decision record must then choose between a module of ekphrasis and a separate plugin.

The milestone *Links* reopens the decision, since the user decided on 2026-10-21 that a link may designate a record by its identifier. A link by identifier needs the index of identifiers set aside above. Therefore, the first step of *Links* is a decision record choosing between a module of ekphrasis and a separate plugin for that index. The rules across files keep running as custom checkers until that record decides otherwise.

### Collections

**Goal.** Every collection kind can be displayed and edited, including insertions, removals and reorderings.

**Modules.** Controls of the collection kinds, identifiers of sequence items kept across reorderings, text edits for items and rows, collapse and expansion.

**Exit criterion.** The keyed records of a geonexus glossary and the record tables of a gnomon target system can be filled, and the golden test still passes after structural edits.

**Risk.** A flow collection, such as an inline mapping of geonexus, holds its entries between braces or brackets, separated by commas, usually on one line. An insertion or a removal must then edit the separating commas, and has no sibling line whose indentation it could copy. The user decided on 2026-10-20 that such an edit keeps the flow form, since converting the collection to block form would rewrite lines that the author did not edit, against the [requirement on source preservation](../requirements.md#^source-preservation). The cost is a second set of insertion rules, beside the rules of block collections.

**Check.** On 2026-10-20, the [acceptance test of collections](../../tests/acceptance/collections.test.ts) filled a new keyed record of the glossary fixture and new rows of the target-system fixture. Each commit applied through the session of the instance, as the form applies it. The [golden test of byte preservation](../../tests/acceptance/saving.test.ts) passed after the structural edits of every collection of the fixtures, and the corpus test of structural edits passed on both consumer projects. The controls, the folding and the vertical guides await the [protocol of collections](../../tests/manual/protocols/collections.md).

### Guidance and navigation

**Goal.** The author is guided at each field and moves through long instances.

**Modules.** Instructions and examples on demand, rendered values with lazy rendering, outline view, area of keys outside the schema.

**Exit criterion.** A question record of gnomon, filled only through the form, needs no consultation of the template comments.

**Check.** A template guides its author by three means: a comment listing the admitted values, a comment giving instructions, and a placeholder showing the form of a value. On 2026-10-20, the [acceptance test of guidance](../../tests/acceptance/guidance.test.ts) built the form of the question template of gnomon from the question schema of the fixtures. Each key of the template was a field of that form, with the admitted values of its comment, with instructions for each other comment, and with an example for each placeholder. The form displays these values in its dropdowns, and the instructions and examples at the help button of each field. The area of keys outside the schema dates from the milestone *Bound form*. The help buttons, the rendered values, the outline and its search await the [protocol of guidance and navigation](../../tests/manual/protocols/guidance-navigation.md).

**Corrections.** The manual check of 2026-10-22 passed, and the observations of the user gave five corrections, listed in the [roadmap](../../TODO.md) and carried out before *Links*: a button clearing the search, buttons folding every section, the spacing of the icon of the title, the keyword `x-align` of formulas, and a check that a focused help button opens by the keyboard.

### Links

**Goal.** The links of values resolve as in notes, and a link designates a field of another instance, from a form or from a note, as the specification of [links](../features/links.md) details.

**Modules.** Parser of field links in the domain, opening of an instance at a field, suggestions of field paths in links, command *Copy link to field*, index of the identifiers of records, and resolution of links by identifier.

**Exit criterion.** A note of the test vault links to a field of a question record by path and by identifier, and each link opens the form at that field. A link inside a Markdown value of a record opens its target field in the same way.

**Risks.** Three premises must be verified by spikes before the steps that rest on them:

- Obsidian passes the subpath of a followed link to the view of a note; whether it passes that subpath to the view of a plugin opening a YAML file is unverified;
- Obsidian resolves a link from a note to a file that is not a note by its path, and the forms of path that it accepts for a YAML file, with or without its extension, are unverified;
- the suggestions of headings in links belong to Obsidian, and whether a plugin can add its own suggestions after a hash sign is unverified.

On 2026-10-22, the declarations of the API, in `obsidian` 1.13.1 and in `obsidianmd/obsidian-api` at version 1.14.4, settled one part of each premise:

- a view receives an ephemeral state through `setEphemeralState(state)`, and `OpenViewState.eState` carries one; no declaration states that following a link passes its subpath to the view of a YAML file, nor under which key;
- `getFirstLinkpathDest(linkpath, sourcePath)` returns `TFile | null`, `TFile` being the type of every file of the vault, and `parseLinktext` splits a link into a path and a subpath starting with `#`; no declaration states which forms of the path of a YAML file resolve;
- `registerEditorSuggest` admits a suggest of a plugin, whose `onTrigger` decides at each key press whether it applies; no declaration states the order among the suggests, nor whether the suggestions of headings yield to a plugin.

The [protocol of the corrections](../../tests/manual/protocols/corrections-guidance.md) settled the remaining part of each premise in a test vault on 2026-10-23, through a disposable plugin retired after the run. Four verdicts bear on the milestone:

- Following a link to a YAML file opens it in the view of the plugin, and then passes the subpath to that view as the ephemeral state `{subpath: "#subject.system"}`. The verdict holds for wikilinks and Markdown links, and for a field path holding brackets, such as `#rows[1].name`.
- A link resolves to a YAML file only when its path holds the extension of the file, as in `guidance.yml`, `./guidance.yml` or `../gnomon/question.yml`. A link without the extension, such as `[[guidance#subject.system]]`, stays unresolved, and a click on it creates a note `guidance.md`.
- A suggestion of the plugin triggers after a hash sign in a Markdown link, such as `[system](guidance.yml#`. In a wikilink, such as `[[guidance.yml#`, the suggestion of headings of Obsidian takes over and offers no match, so no suggestion of the plugin shows.
- A click on a link `obsidian://ekphrasis-spike?…`, in the reading view and in the live preview of a note, reaches the handler of the plugin inside the vault. Obsidian consumes the parameter `vault`, so the handler never receives it.

The [protocol of links](../../tests/manual/protocols/links.md) verified on 2026-10-29 two further cases. A link whose path starts from the vault root, as the command *Copy link to field* writes it, resolves from a note stored in a subfolder. Obsidian ends a wikilink at its first `]]`, so a wikilink whose field path ends with a bracket needs a displayed text.

A link by identifier also needs a syntax that the Markdown renderer of Obsidian passes to ekphrasis, since an identifier is not a path. The [decision on record identifiers](../adr/record-identifiers.md), accepted on 2026-10-23, settles three choices:

- a link by identifier is a URI of Obsidian handled by ekphrasis;
- the keyword `x-identifier` declares the field of the identifier of a record type;
- a module of ekphrasis holds the index of identifiers.

### Form presentation

**Goal.** The form reads as concisely as the properties of a note, and the outline stays at hand in the right sidebar, as the [requirement on visible structure](../requirements.md#^visible-structure) demands. The steps come from the pilot of 2026-10-29 on the contacts and the exchanges of geonexus.

**Modules.** Rows of fields with an icon of their kind, one appearance and one font size for every text control, help buttons and descriptions of options on demand, editing of long single-line values, and the outline opened in the right sidebar.

**Exit criterion.** A contact record of geonexus displays every field as a row with its icon, its name and its control, with no control shifted by a dropdown or a help button, and the outline opens in the right sidebar with the plugin.

**Risks.** A long single-line value either wraps or scrolls, and the choice is left to a step of the milestone. The rows of fields become the pattern of the panel of properties of *Metadata*, so this milestone precedes it.

### Schema styles

**Goal.** The presentation of the forms of a schema is declared apart from the schema, as the [requirement on schema styles](../requirements.md#^schema-styles) demands.

**Modules.** Decision record on the declaration of styles, reading of the style of a schema, widths by presets, icons of fields, placement of a control below its label, and captions of alternatives.

**Exit criterion.** A style declared for the contact schema of geonexus sets a compact width on one column, places one control below its label and renames the caption of one alternative, while the schema stays unchanged.

**Risks.** The schema dialect already holds presentation keywords: `x-collapsed`, `x-align`, `x-list-layout` and `x-image-width`. The decision record states which of them move to the style, so it precedes the milestones that add further presentation keywords.

### Metadata

**Goal.** The metadata of an instance displays apart from its form, as the properties of a note, and its aliases serve links, as the specification of [metadata](../features/metadata.md) details.

**Modules.** Reading of the setting *Metadata field* and of the keyword `x-metadata`, panel of properties above the form, suggestions of aliases in links, links of the metadata block, and the schema of the record displayed as a link with its version.

**Exit criterion.** The metadata block of a geonexus audience record displays as a panel of properties, its link `index` opens its target, and its alias is suggested in a link of a note and fills the display text of the link inserted.

**Risks.** The link suggestions of Obsidian draw the aliases of notes from their frontmatter. Whether a plugin can add the aliases of YAML instances to those suggestions is unverified, so a spike opens the milestone. The milestone builds on the suggestions of field paths of *Links*.

### Tags

**Goal.** The tags of instances join a tree of tags, displayed and searched in a side panel, as the specification of [tags](../features/tags.md) details.

**Modules.** Collection of the tags of each instance, tree of tags nested by slashes, side panel of the tree, and search with combinations and exclusions.

**Exit criterion.** The tree lists the tags of the geonexus specifications, nested by their slashes, and a search combining one tag and excluding another lists the expected files.

**Risks.** Whether the tag pane and the search of Obsidian list any tag of a YAML file is unverified, so a spike opens the milestone. The user decided on 2026-10-29 the values that may carry tags, the joined tree of instances and notes, and the syntax of the search, as the specification of [tags](../features/tags.md) records. A tag pane of Obsidian listing the tags of YAML files would reopen the joined tree.

### Images

**Goal.** A form displays the images of its record, embedded in its values or held by a field, as the specification of [images](../features/images.md) details.

**Modules.** Verification of the images embedded in rendered values, a field kind holding an image, its display, and a control choosing an image file of the vault.

**Exit criterion.** A record of the test vault displays an SVG image and a PNG image, one embedded in a Markdown value and one held by a field, and the control of the field replaces its image by another file.

**Risks.** The rendered values of a form are narrow, and an embedded image takes the width set by the Markdown renderer. Whether that width suits a field of the form is unverified, so the first check observes it inside Obsidian. The width of an image is set by the keyword `x-image-width` of its field, or by its value, as the specification of [images](../features/images.md) records.

### Field kinds

**Goal.** Internal links with a display text, web addresses, email addresses, telephone numbers and tasks are each edited through a control of their own, as the [requirement on field formats](../requirements.md#^field-formats) demands.

**Modules.** Decision on the names and the value forms of the kinds, and one control per kind.

**Exit criterion.** A contact record of geonexus edits its web and email addresses through their kinds, and each address opens its application.

### Dates

**Goal.** Dates of several precisions are edited through controls of their own, as the [requirement on field formats](../requirements.md#^field-formats) demands.

**Modules.** Decision on the value of each variant, controls with placeholders and pickers, validation of each variant.

**Exit criterion.** Each temporal expression of the contact records of geonexus, calendar date, range and relative date, is edited through its control and passes the checks of geonexus.

**Risks.** The temporal schema of geonexus writes each date as an object among alternatives, and the pilot of 2026-10-29 found that a schema alone renders it poorly. The decision on the value forms states whether the kind adapts to those objects or the records change.

### List editing

**Goal.** Lists are displayed inline when flat, and their items are inserted at any position, dragged and ordered, as the [requirement on list editing](../requirements.md#^list-editing) and the [decision on list layouts](../adr/list-layouts.md) demand.

**Modules.** Compact and expanded layouts, insertion between items, reordering by dragging, ordering modes.

**Exit criterion.** A list of a geonexus record is displayed inline, an item is inserted between two others and dragged to another position, and an ordering mode sorts the list, each edit keeping the comments of the file.

### Conditional fields

**Goal.** The value of a field determines which of its dependent subfields the form displays, as the [requirement on conditional fields](../requirements.md#^conditional-fields) demands.

**Modules.** Decision on the constructs that select the subfields, model of the displayed subfields, and the fate of the filled subfields that a new value excludes.

**Exit criterion.** In a contact record of geonexus, choosing the origin *peer-introduction* displays the field naming the introducer, and choosing another origin hides it.

### Instance creation

**Goal.** A command creates a new record from its schema.

**Modules.** Skeleton, commands, schema folder in the settings.

**Exit criterion.** A record created by *Create instance* and filled through the form passes the existing checks of its consumer project.

### Custom checkers

**Goal.** The Python checks of a project run from the form, and a user defines field kinds of their own, as the [requirement on custom kinds](../requirements.md#^custom-kinds) demands.

**Modules.** Python process, message protocol, runner script, registration in the settings, timeouts, discarding of stale results, and custom field kinds pairing a control with a checker.

**Exit criterion.** One existing checker of each consumer project runs from a schema rule and reports at the correct field.

**Risk.** A community plugin is distributed as three files (bundle, manifest, style sheet), so the runner script cannot ship as a file of its own. The bundle must embed the script as a string, and pass it to the interpreter at start. The spike on the Python process confirmed this route, as the decision on [Python checkers](../adr/python-checkers.md) records.

### Schema editor

**Goal.** Schemas are created and modified through a form.

**Modules.** Decision on schema versions, meta-schema of the dialect, command *Create schema*, preview panel.

**Exit criterion.** The schema of a gnomon question record is written entirely in the schema editor, and its instances validate.

### Release

**Goal.** A first public version.

**Modules.** Example vault, release workflow, review of the documentation against the code.

**Exit criterion.** A vault installed from the release opens the example vault, and the consumer projects bind their records without local changes to the plugin.

## Dependencies

The runtime dependencies are fixed by the decision records: `yaml`, `preact`, the JSON Schema validator `ajv` in its build for draft 2020-12 with its extension `ajv-formats`, and the YAML language mode of CodeMirror 6. All five are installed. Ajv was verified inside Obsidian with the option `strictSchema` disabled, as the decision on the [schema dialect](../adr/json-schema-dialect.md) records. The YAML language mode `@codemirror/lang-yaml` is bundled with the plugin, whereas Obsidian supplies the core packages of CodeMirror at run time. Therefore, the bundler names those core packages one by one as external, and a wildcard over `@codemirror/*` must not replace that list.

Path rules are matched by a glob matcher of the domain, so that the domain keeps no dependency. The matcher accepts the [glob syntax of path rules](../features/instance-files.md#^glob-syntax). Ajv validates the keyword `format` only through its extension `ajv-formats`, which the validator registers in its full mode, so that a date is also checked against its calendar range.
