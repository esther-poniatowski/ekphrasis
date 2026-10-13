---
tags:
  - architecture
index: "[Architecture](docs/architecture/_index.md)"
aliases:
  - Implementation plan
---
# Implementation plan

The implementation plan orders the construction of ekphrasis into ten milestones, from the toolchain to the schema editor. Each milestone delivers a form usable in a vault, so that every later milestone extends a working plugin. The steps of each milestone, with their state, are listed once in the [roadmap](../../TODO.md). This note fixes the goal of each milestone, the modules it creates, its exit criterion and the risks it must resolve.

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

**Modules.** Unfilled values, mapping of the errors of the validator to field paths, predefined checkers, relative paths of rules, display of issues, command *Validate instance*. Candidate predefined checkers cover the rule families shared by the consumer projects: references across files, uniqueness and acyclicity.

**Exit criterion.** The conditional rule of gnomon, in which the epistemic aim of a question decides the required fields, is expressed in a schema and reported correctly on the fixtures.

**Risk.** The validator reports locations as JSON Pointers, and an error on a missing property points to the parent object. Both must be converted to the field path of the missing field.

**Evaluation of shared rule families.** The three families shared by the consumer projects reach beyond one instance:

- a reference of gnomon, such as `system.TOPIC#SYMBOL`, designates a symbol declared in another record;
- geonexus requires identifiers unique across the glossaries of a vault;
- acyclicity holds over the graph of such references.

Therefore, a predefined checker of these families must rely on an index of the vault, with four parts:

- a port that reads every instance bound to a schema;
- an index of the declared identifiers, kept current through the changes, renames and deletions of files;
- the invalidation of the issues of every instance that depends on a changed file;
- a validation that runs after the commit, since the index reads other files.

These four parts amount to a milestone, so the checkers of these families are left out of *Validation*. The recommended route is a milestone *Rules across files*, placed after *Custom checkers*. A check across files reads other files after the commit, so its results arrive late, and may concern a text already superseded. The milestone *Custom checkers* settles these two points for the Python checkers, and the new milestone can reuse that solution. The new milestone would build the index, and on it the checkers of references, of uniqueness across files and of acyclicity. Until then, the custom checkers of each project carry these rules, and the checker `unique-by` covers uniqueness within one sequence.

### Collections

**Goal.** Every collection kind can be displayed and edited, including insertions, removals and reorderings.

**Modules.** Controls of the collection kinds, identifiers of sequence items kept across reorderings, text edits for items and rows, collapse and expansion.

**Exit criterion.** The keyed records of a geonexus glossary and the record tables of a gnomon target system can be filled, and the golden test still passes after structural edits.

**Risk.** A flow collection, such as an inline mapping of geonexus, holds its entries between braces or brackets, separated by commas, usually on one line. An insertion or a removal must then edit the separating commas, and has no sibling line whose indentation it could copy. Before this milestone starts, the plan must settle whether such an edit keeps the flow form or converts the collection to block form. Keeping the flow form preserves the layout chosen by the author, at the cost of a second set of insertion rules.

### Guidance and navigation

**Goal.** The author is guided at each field and moves through long instances.

**Modules.** Instructions and examples on demand, rendered values with lazy rendering, outline view, area of keys outside the schema.

**Exit criterion.** A question record of gnomon, filled only through the form, needs no consultation of the template comments.

### Instance creation

**Goal.** A command creates a new record from its schema.

**Modules.** Skeleton, commands, schema folder in the settings.

**Exit criterion.** A record created by *Create instance* and filled through the form passes the existing checks of its consumer project.

### Custom checkers

**Goal.** The Python checks of a project run from the form.

**Modules.** Python process, message protocol, runner script, registration in the settings, timeouts, discarding of stale results.

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
