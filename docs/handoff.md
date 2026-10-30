---
tags:
  - handoff
index: "[ekphrasis documentation](docs/_index.md)"
aliases:
  - Handoff
---
# Handoff

The handoff carries the state of the implementation of ekphrasis from one agent session to the next. Each session reads it first, works on one milestone of the [implementation plan](architecture/implementation-plan.md), checks the completed steps in the [roadmap](../TODO.md), and updates this note before ending.

## Task state

The milestones *Bound form*, *Saving of scalars*, *Validation* and *Collections* are complete, together with the corrections that followed the check of *Validation*, and every step of each is checked in the [roadmap](../TODO.md). Their [manual protocols](../tests/manual/_index.md) passed inside Obsidian, the last one, the protocol of collections, on 2026-10-20. The repository is published at `https://github.com/esther-poniatowski/ekphrasis`. The rules across files run as custom checkers, as the [decision on rules across files](architecture/implementation-plan.md#^rules-across-files) records.

The milestone *Guidance and navigation* is complete: its [protocol](../tests/manual/protocols/guidance-navigation.md) passed inside Obsidian on 2026-10-22, and every step is checked in the roadmap. The user approved on 2026-10-22 the extension of the question schema of the gnomon fixtures, made by that milestone. The observations of the protocol gave the section *Corrections after the check of Guidance and navigation* of the roadmap. The five corrections are implemented since 2026-10-22. Component tests cover them, and the feature notes specify them. The [protocol of the corrections](../tests/manual/protocols/corrections-guidance.md) passed inside Obsidian on 2026-10-23, after two fixes: the size of the icons of the outline, and the installation of the spike plugin. Their steps are checked in the roadmap. The user added a sixth step, a button and two commands showing or hiding every instruction, checked by the protocol of the corrections of links on 2026-10-29.

The milestone *Links* is complete: its [protocol](../tests/manual/protocols/links.md) passed inside Obsidian on 2026-10-29, and the [protocol of its corrections](../tests/manual/protocols/corrections-links.md) on the same day. Every step is checked in the roadmap, and the [implementation plan](architecture/implementation-plan.md) records the verdicts of its spikes and of its protocol. The decisions that later milestones must respect are recorded in the [decision on record identifiers](adr/record-identifiers.md) and in the specification of [links](features/links.md). The records of both protocols lie in `tests/manual/scenarios/`: the notes `field-links.md` and `corrections-links.md`, the record `links.yml` with its schema, the records `twin-a.yml` and `twin-b.yml`, and the notes reached by the links.

The binding by a schema registry was added on 2026-10-29: a record names its schema by a logical identifier in its top-level field `_schema`, resolved through the registry named by the setting *Schema registry*, as the specification of [instance files](features/instance-files.md#^binding-sources) and the [decision on schema binding](adr/schema-binding.md) state. Unit tests cover it, and its [protocol](../tests/manual/protocols/schema-registry.md) passed inside Obsidian on 2026-10-29, so its roadmap step is checked. Its records lie in `tests/manual/scenarios/registry/`.

The user also accepted on 2026-10-23 three choices made by the corrections: the buttons of the outline fold its own entries, the buttons of the form sit in the header of the view, and a value of `x-align` other than `left` falls back to `center` without a warning.

On 2026-10-26, the user accepted the [list-layout policy](adr/list-layouts.md). The roadmap leaves two steps unchecked: define the diagnostic rule, then implement the layouts.

The milestone *Form presentation* is complete: its [protocol](../tests/manual/protocols/form-presentation.md) passed inside Obsidian on 2026-10-30, and every step is checked in the roadmap. The observations of the protocol gave the section *Corrections after the check of Form presentation* of the roadmap. Component tests cover the changed behaviours, and the specifications of the [form view](features/form-view.md), the [field kinds](features/field-kinds.md) and the [outline](features/outline.md) state them. The protocol runs on the record `presentation.yml` of `tests/manual/scenarios/`, which holds one field of each kind. The user approved on 2026-10-30 the choices made by the implementation that the specification did not settle: the descriptions of the options listed in the instructions of the field, the message *No entries.* kept for a group without fields, no icon in the headers of the columns of a table, and the focus kept in the input after the key `Enter`. The user also decided that the outline opens at the first load only, so a closed outline stays closed, and that a value already holding a line break keeps its line breaks in a wrapping input.

After *Links*, the roadmap orders thirteen milestones, as the [implementation plan](architecture/implementation-plan.md) details: *Form presentation*, *Schema styles*, *Metadata*, *Field kinds*, *Dates*, *Tags*, *Images*, *List editing*, *Conditional fields*, *Instance creation*, *Custom checkers*, *Schema editor* and *Release*. The user added *Metadata*, *Tags* and *Images* on 2026-10-23, specified by the notes on [metadata](features/metadata.md), [tags](features/tags.md) and [images](features/images.md), and took their opening decisions on 2026-10-29, so each now opens with a spike. The observations of the pilot of 2026-10-29 on the contacts and the exchanges of geonexus gave *Form presentation*, *Schema styles*, *Field kinds*, *Dates*, *List editing* and *Conditional fields*, together with steps added to *Metadata* and *Custom checkers*; *List editing* takes over the two steps of the compact list layout. The milestone *Instance creation* opens with the measure of the slow corpus tests of geonexus.

Each decision record verified by a spike states the constraints that the later milestones must respect: in its section *Verification*, or for the extension conflict in its consequences.

## Environment

- Node 22 is expected, as the version file `.nvmrc` fixes. The dependencies are installed in `node_modules/`.
- The folder `.obsidian/` at the repository root holds the settings of the user for reading the repository as a vault. It stays uncommitted.
- The protocols of the [manual tests](../tests/manual/_index.md) run in the test vault `examples/test-vault/`, built or reset by `npm run test-vault` as the [contribution guidelines](../CONTRIBUTING.md) describe. A new milestone that needs a manual check adds its protocol to `tests/manual/protocols/`, and its records to `tests/manual/scenarios/`. The vault itself is ignored by git. The YAML Editor plugin, needed for the test of the extension conflict, is installed in the vault by hand, and the script keeps it across rebuilds.
- The prose linter runs through `conda run -n hermeneia hermeneia lint <path>`, with the conda executable of the user.
- The corpus test reads every YAML file under the folder named by `EKPHRASIS_CORPUS`, for instance `EKPHRASIS_CORPUS=<gnomon> npm test`.

## Constructs of the consumer projects

The synthetic fixtures of `tests/fixtures/` reproduce the constructs below, and the header comment of each fixture lists the constructs that it covers. Records of the consumer projects are never copied into this public repository: the optional corpus test reads them from the folder named by `EKPHRASIS_CORPUS`, and is skipped when the variable is unset. The local folders of the two projects are written `<gnomon>` and `<geonexus>`, and the user provides their locations on request.

**gnomon** (`<gnomon>`):

- records with the extension `.yml`, and no JSON Schema: the constraints live in the templates of `src/gnomon/data/templates/`, in the registries `vocabularies.yml` and `requirements.yml`, and in the Python checkers of `src/gnomon/completeness.py` and `src/gnomon/vocabulary.py`;
- the unfilled value `open`, admitted by every closed field, and placeholders in uppercase, sometimes double-quoted;
- prose in single-line quoted scalars, some longer than 400 characters, and LaTeX in single-quoted scalars;
- flow sequences such as `[pop, t]`, and flow mappings such as `{verdict: pending, evidence: ""}`;
- a map `maturity` keyed by dotted field paths, and references such as `system.TOPIC#SYMBOL`;
- the conditional rule `unmet_by_aim`, in which `task.epistemic_aim` decides the required fields;
- the generated file `vocabulary.yml`, which must never be edited.

**geonexus** (`<geonexus>`):

- schemas in JSON Schema 2020-12 written in YAML, in `utils/schemas/`, with `$ref` across files, `additionalProperties: false`, admitted values as `oneOf` of `{const, description}`, and the project keyword `x-checks`;
- binding by path patterns in `config/checks.yaml`, and the field `schema_version` fixed by `const`;
- placeholders written `'{{UPPERCASE}}'`, and maps keyed by identifiers in kebab case;
- sequences of flow mappings, and `oneOf` alternatives such as `concept` against `undeclared`;
- the checker `utils/scripts/check_glossary.py`, whose issues carry a file, a key path, a kind, a detail and a blocking flag.

## Active constraints

- **Documentation**: every new note follows the [documentation conventions](documentation-conventions.md) and is registered in the index of its folder in the same edit. Each completed roadmap step carries its date.
- **Layers**: the [layers and dependency rule](architecture/layers.md) applies, and `preact` is admitted in the adapters layer only.
- **Git**: commits land on `main`, without a new branch, in the format of the commit template `.gitmessage`.
- **Consumer projects**: they are read, never modified. The accepted decision of geonexus that names the suffix `.yaml.md` is updated by the user.

## Open questions

The open decisions are recorded where they are settled: the roadmap steps opening with *decide* or *evaluate*, and the risks of each milestone in the implementation plan. The links of the Markdown files are checked by `npm run check:links`, in the continuous integration as well.

## Provenance

- The constructs of the consumer projects come from a read-only survey of both repositories, made on 2026-09-30.
- The interface technology of the form plugins comes from their GitHub repositories, as read on 2026-10-01 and recorded in the [assessment of form plugins](references/existing-plugins-forms.md#^interface-technology).
- The signatures of the Obsidian API were read in `obsidian.d.ts` of the repository `obsidianmd/obsidian-api`, and checked against the installed package `obsidian` 1.13.1: `MarkdownRenderer.render(app, markdown, el, sourcePath, component)`, `renderMath(source, display)` returning an element, `registerExtensions(extensions, viewType)`, and `TextFileView` with `requestSave`.
- The packages that Obsidian supplies at run time, named as external by the bundler, come from the esbuild configuration of the repository `obsidianmd/obsidian-sample-plugin`, as read on 2026-10-01.
- The syntax-tree functions of the `yaml` library (`keepSourceTokens`, `CST.setScalarValue`, `CST.stringify`) and the class `Ajv2020` come from their official documentation, and were checked against the declarations of the installed versions (`yaml` 2.9.1, `ajv` 8.20.0, `preact` 11.0.0).
- The order of the errors of Ajv (`ajv` 8.20.0) was observed on 2026-10-13, with three results. The errors of the alternatives of a `oneOf` immediately precede the error of the keyword. An error inside a `$ref` carries the schema path of the referenced document. A key rejected by `propertyNames` yields an error with the field `propertyName`.
- The rule `by_aim` of gnomon was read in `src/gnomon/data/requirements.yml` and `unmet_by_aim` of `src/gnomon/completeness.py` on 2026-10-13: `null`, `[]`, `{}` and `open` count as unfilled.
- The indentation of a new scalar token was read in the source of `CST.createScalarToken` (`node_modules/yaml/dist/parse/cst-scalar.js`, `yaml` 2.9.1): its option `indent` sets the indentation of the content, whereas `CST.setScalarValue` adds two spaces to the indentation of the token for a value after a key. Both write with `lineWidth: -1`, so no value is folded.
- The comments and placeholders of the question template of gnomon were read in `src/gnomon/data/templates/question.yml` on 2026-10-20. The library `yaml` 2.9.1 attaches the comment after a scalar value to that value as `comment`, the comment after the key of a collection to the collection as `commentBefore`, and the comments before the first key to the document.
- The signatures of `MarkdownRenderer.render`, `renderMath`, `finishRenderMath`, `Keymap.isModEvent`, `Component.addChild` and `removeChild`, `Workspace.getRightLeaf` and `revealLeaf` were checked against the installed `obsidian.d.ts` on 2026-10-20.
- The sizes of the consumer records were measured on 2026-10-20: the longest question record of gnomon holds 52 string values, the longest of 339 characters; the largest geonexus record, `notation.yml`, holds 1091 string values, none rendered since its schema declares no rendered kind.
- The signatures of `FileManager.generateMarkdownLink(file, sourcePath, subpath?, alias?)` and of the events `create`, `modify`, `delete` and `rename` of `Vault` were read in the installed `obsidian.d.ts` (1.13.1) on 2026-10-23.
- The signatures of `WorkspaceLeaf.setViewState(viewState, eState?)`, `View.setEphemeralState(state)`, `EditorSuggest` with `onTrigger`, `getSuggestions`, `renderSuggestion` and `selectSuggestion`, and `ObsidianProtocolData`, whose values are strings, were read in the installed `obsidian.d.ts` (1.13.1) on 2026-10-23.
- The icons of the property types and the style of the properties, of the inputs and of the core outline were read on 2026-10-30 in the bundle of the installed Obsidian 1.14.5 (`obsidian-1.14.5.asar`). The property types show `lucide-text` for text, `lucide-list` for a list, `lucide-binary` for a number, `lucide-check-square` for a checkbox, `lucide-calendar` for a date and `lucide-clock` for a date and time. The inputs, the text areas and the dropdowns take the font size `--font-ui-small`, 13 px by default, the smallest size used by the text controls of the form before this milestone. The installed application runs that bundle on Electron 28.2.3.
- The source ranges of collections were observed on 2026-10-20 with `yaml` 2.9.1, and the [edits of collections](../src/domain/edit/collection-edits.ts) rely on them. The range of a mapping item of a block sequence ends after the line break of its last line. The range of a block sequence includes the comment lines between its items. The range of a flow collection spans its brackets or braces, and excludes any comment after the closing one.

## Decision log

The design decisions and their rationale are recorded in the [architecture decisions](adr/_index.md), and the order of construction in the implementation plan. Five decisions about the work itself are recorded here:

- **One session per milestone**: each session ends on a verified state (exit criterion met, roadmap checked, commit made), so that the next session starts from the repository rather than from a conversation.
- **Synthetic fixtures**: the records of the consumer projects stay outside this public repository.
- **Disposable spike plugin**: a spike that needs a running Obsidian runs in a separate plugin, deleted once its verdict is recorded, so that `src/` holds no spike code. Its retirement deletes the plugin and reverts its build settings and its installation in `scripts/test-vault.mjs`, as the commit `4ca6b67` did for the first spikes and the retirement of 2026-10-23 for the spikes of *Links*.
- **Corpus variable**: the environment variable `EKPHRASIS_CORPUS` names one folder, and several projects can be gathered in it by symbolic links.
- **Spike verdicts in decision records**: each verdict changes the status of its record from proposed to accepted, or reopens the decision before the milestone that depends on it.

## Warnings

- A manual test of a change made outside must keep the focus in Obsidian, since leaving the window commits the focused field. The *Third check* of the [protocol of saving](../tests/manual/protocols/saving.md) changes the file through delayed shell commands for this reason.
- Every form state carries the report of the [validation service](../src/application/validation-service.ts), since the form service and the commit service validate each model that they build. A new path that builds a form state must validate it as well. The milestone *Custom checkers* must add its results to that report, and run them from the command *Validate instance*.
- The merge of the alternatives of a `oneOf` relies on the order of the errors of Ajv, recorded under *Provenance*. After an upgrade of Ajv, the tests of the [conversion of validator errors](../tests/domain/validation/validator-errors.test.ts) and the [acceptance test of validation](../tests/acceptance/validation.test.ts) must still pass.
- MathJax loads after the plugin, so the checker `latex` reports no issue on a form validated before MathJax is ready. The next commit or the command *Validate instance* then reports the formula.
- The file `obsidian.d.ts` exceeds the length that web fetching tools process, and their summaries of it have returned invented signatures. Read the file through `gh api -H "Accept: application/vnd.github.raw" repos/obsidianmd/obsidian-api/contents/obsidian.d.ts`, filtered with `grep`.
- No tooltip displayed on the lock badges of the form during the manual test, whether written by the attribute `title`, by `aria-label`, or by the function `setTooltip` of Obsidian. The cause is not diagnosed. Therefore, the form explains a lock by a note that a click on its symbol reveals, as the [field label](../src/adapters/obsidian/ui/field-label.tsx) implements. Any later explanation on demand, such as the instructions of the milestone *Guidance and navigation*, must not depend on hover, since touch devices have none.
- A field reached through an alias or a merge key carries a lock in the [form model](../src/domain/form/model.ts), since the text of its value lies at the anchor. A commit must never write at a locked field.
- The package `@codemirror/commands` is pinned to 6.10.2, because its later versions require `@codemirror/state` 6.6 or later, whereas Obsidian 1.13 supplies 6.5.0. A second copy of `@codemirror/state` in `node_modules/` breaks the identity checks between editor extensions. Therefore, after any upgrade of a CodeMirror package, the command `npm ls @codemirror/state` must list a single version.
- Every edit of the source text goes through the [plan of commits](../src/domain/edit/commit-plan.ts) and the [commit service](../src/application/commit-service.ts). The commit service confirms each edit by parsing the new text. A commit applies only to the text from which its form model was built, so the [instance session](../src/application/instance-session.ts) queues the scalar commits made while a text loads or fails to parse. The session refuses the structural commits meanwhile, since their positions may designate other items in the new text. A sequence of commits, such as the removals of a switch of alternative, goes through the method `commitAll` of the session. That method writes the final text once, and keeps the text and the identifiers of items unchanged when one commit is refused.
- The [identifiers of items](../src/domain/form/item-identities.ts) belong to the session, and the commit service updates them after each confirmed structural commit. When a new path builds a form model, it must pass the identities of its session; otherwise, the controls of the items lose their state at each rebuild. The draft of a new entry of a keyed mapping keys its nested sequences by the identity of the entry template. Therefore, a control inside such a nested draft is rebuilt once, at its first commit.
- Every field of the [form model](../src/domain/form/model.ts) carries the flag `unfilled`, read by the controls to display an empty control, and by the form to disable a forbidden field only while it is unfilled. When a new path builds fields, it must set that flag from the values of `x-unfilled`.
- The runs recorded in the protocols of the bound form, saving, validation, the corrections and collections predate the empty values of the scenario records, decided on 2026-10-20. Their records now write empty values where these protocols expect `open`, and their schemas declare no `x-unfilled`. These protocols stay as they ran; a rerun must read `open` in their items as an empty value.
- The geonexus corpus declares its file types in `specs/vocabulary/file-types.yml` since 2026-10-16, and the [corpus test of validation](../tests/acceptance/corpus-validation.test.ts) reads them there.
- Each refusal reason of the plan is listed in `REFUSALS` of the [plan of commits](../src/domain/edit/commit-plan.ts). The golden test accepts two of them only: a locked value, and a removal that would delete a comment inside a flow collection.
- The scenario record of collections writes the siblings of the new entries of the sections *Records* and *Keyed entries* in block form, so their items check the block form. The field *series* checks the flow form. A protocol that adds a new collection must choose the form of its siblings accordingly.
- The class `ConfirmationModal` of Obsidian requires version 1.13, whereas the manifest admits 1.5. Therefore, the [confirmation of a loss of values](../src/adapters/obsidian/views/loss-confirmation.ts) extends `Modal`.
- Prettier must never format `tests/manual/`, since the protocols record the ticks of the user. The command `npm run format` applies the ignore file `config/tools/prettier.ignore`, whereas a direct call of `npx prettier` on a folder does not.
- The simulated DOM `happy-dom` replaces the global class `URL`, so a test module resolves a file path by joining paths, as [the discovery of YAML files](../tests/support/yaml-files.ts) does. The [rendered form](../tests/support/rendered-form.tsx) renders a form through the session of an instance for component tests.
- The gnomon fixtures keep the unfilled value `open` and the keyword `x-unfilled: [open]`, since they reproduce gnomon as it stands. The user decided on 2026-10-20 that gnomon will write empty values (null) as its unfilled value, as a task of the gnomon project. Once gnomon has switched, the fixtures of `tests/fixtures/gnomon/` must drop `x-unfilled: [open]` and use empty values, and the acceptance tests that expect `open` must follow.
- Every display of the form receives the shown instructions, the renderer of values, the scheduler of renderings, the painter of icons and the move to a field, through the props of the [form panel](../src/adapters/obsidian/ui/form-panel.tsx). Component tests pass the renderer of plain text, the immediate scheduler and the painter `NO_ICONS`, as the [rendered form](../tests/support/rendered-form.tsx) does. The [outline panel](../src/adapters/obsidian/ui/outline/outline-panel.tsx) receives the painter of icons in the same way.
- The inputs of the kinds `text`, `markdown-line` and `latex` are text areas of one row, as the [wrapping input](../src/adapters/obsidian/ui/controls/wrapping-input.tsx) implements, so a test or a protocol reaching them by the selector `input` finds none. Obsidian 1.14.5 runs on Electron 28, whose Chromium 120 ignores the property `field-sizing`, so the input fits its height by script, at each change of its text and of its width.
- The outline panel draws its entries with the classes of the core outline of Obsidian (`tree-item`, `tree-item-self`, `collapse-icon`, `tree-item-children`), so a change of these classes in a later version of Obsidian changes its style. The panel keeps its own classes `ekphrasis-outline-*` for the tests and for the marks of issues.
- The size of a batch of renderings, fifteen values or 40 ms, lives in `DEFAULT_QUEUE_OPTIONS` of the [queue of renderings](../src/adapters/obsidian/ui/rendering/render-queue.ts). The protocol of guidance and navigation records each batch longer than 50 ms reported in the console; such a report calls for a smaller batch.
- Obsidian lists a plugin of the test vault only when its folder is a real folder: a symbolic link to a whole folder is not listed. A plugin installed by `scripts/test-vault.mjs` is therefore a real folder holding links to its files, as ekphrasis is.
- A link to a YAML file without its extension, such as `[[guidance#subject.system]]`, stays unresolved, and a click on it creates a note named after the link.
- A followed link reaches the [instance view](../src/adapters/obsidian/views/instance-view.ts) as the ephemeral state `{subpath}`, possibly before the form of the file is built. Therefore, the view keeps the subpath until the session holds the state of the current text. When a new route opens an instance at a field, that route must pass the subpath in the same way, as the [opener of field links](../src/adapters/obsidian/field-link-opener.ts) does through `setViewState`.
- The command *Copy link to field* reads the index of identifiers. Therefore, when the identifier of a record was edited a moment earlier, the command can still link the record by its former identifier, until the event `modify` of the vault reaches the index.
- The question schema of the fixtures restates the comments and the placeholders of the question template of gnomon. The [acceptance test of guidance](../tests/acceptance/guidance.test.ts) compares them when the corpus of gnomon is named, so a change of that template is reported there, and the fixture schema must follow it.

