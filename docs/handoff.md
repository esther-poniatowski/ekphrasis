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

The milestones *Bound form*, *Saving of scalars* and *Validation* are complete, and every step of each is checked in the [roadmap](../TODO.md). The repository is published at `https://github.com/esther-poniatowski/ekphrasis`.

The [protocol of validation](../tests/manual/protocols/validation.md) passed inside Obsidian on 2026-10-19, with every item ticked. Its section *Observations* holds remarks of the user on the presentation, triaged with the user before the next milestone. The rules across files run as custom checkers, as the [decision on rules across files](architecture/implementation-plan.md#^rules-across-files) records.

The exit criterion of *Validation* is verified by the [acceptance test of validation](../tests/acceptance/validation.test.ts). The question fixture expresses the rule `by_aim` of gnomon by rules `required-when`, and each aim reports exactly the unfilled fields that it requires. The [corpus test of validation](../tests/acceptance/corpus-validation.test.ts) compares the same rule with the registry of gnomon on its question records, and validates the records of geonexus against their schemas.

The [protocol of the corrections](../tests/manual/protocols/corrections-validation.md) passed inside Obsidian on 2026-10-20. Its section *Observations* gave five steps, closing the section *Corrections after the check of Validation* of the roadmap. Three of them are implemented, tested and ticked. The other two steps are implemented but visible in Obsidian only: the colour of the title of the box of issues, and the alignment of the messages of both boxes. Both stay unticked until the manual check.

The milestone *Collections* is implemented. Three of its steps are ticked: the identifiers of items, and the edits of flow and block collections. The other three, the controls of the collection kinds, the folding of sections and the vertical guides, stay unticked until the manual check. The exit criterion is verified by the [acceptance test of collections](../tests/acceptance/collections.test.ts). That test fills a keyed record of the glossary fixture and rows of the target-system fixture. The [golden test of byte preservation](../tests/acceptance/saving.test.ts) passes after the structural edits of every collection of the fixtures, and the [corpus test of structural edits](../tests/acceptance/corpus-collections.test.ts) passes on both consumer projects.

**Next action**: the user runs the [protocol of collections](../tests/manual/protocols/collections.md) inside Obsidian, in the test vault already built on 2026-10-20. The protocol also covers the five corrections. Once its items pass, the five unticked steps above are ticked with the date of the run, and the observations are triaged with the user before *Guidance and navigation*.

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

The open decisions are recorded where they are settled: the roadmap steps opening with *decide* or *evaluate*, and the risks of each milestone in the implementation plan. Three further questions await the user:

- whether a link checker joins `scripts/`, since the checker used during the documentation work lived in a temporary folder;
- whether a new collection under a block mapping should take the flow form when its sibling entries write the same key in flow form. The current rule writes the block form, as the [rules of collections](features/saving.md#^structural-edits) state, so a new row of gnomon receives `signature:` on its own line, whereas its siblings write `signature: [bob, t]`;
- whether choosing another alternative should remove the keys of the previous alternative. The form keeps them until their fields are cleared, so a value can match two alternatives meanwhile.

## Provenance

- The constructs of the consumer projects come from a read-only survey of both repositories, made on 2026-09-30.
- The interface technology of the form plugins comes from their GitHub repositories, as read on 2026-10-01 and recorded in the [assessment of form plugins](references/existing-plugins-forms.md#^interface-technology).
- The signatures of the Obsidian API were read in `obsidian.d.ts` of the repository `obsidianmd/obsidian-api`, and checked against the installed package `obsidian` 1.13.1: `MarkdownRenderer.render(app, markdown, el, sourcePath, component)`, `renderMath(source, display)` returning an element, `registerExtensions(extensions, viewType)`, and `TextFileView` with `requestSave`.
- The packages that Obsidian supplies at run time, named as external by the bundler, come from the esbuild configuration of the repository `obsidianmd/obsidian-sample-plugin`, as read on 2026-10-01.
- The syntax-tree functions of the `yaml` library (`keepSourceTokens`, `CST.setScalarValue`, `CST.stringify`) and the class `Ajv2020` come from their official documentation, and were checked against the declarations of the installed versions (`yaml` 2.9.1, `ajv` 8.20.0, `preact` 11.0.0).
- The order of the errors of Ajv (`ajv` 8.20.0) was observed on 2026-10-13, with three results. The errors of the alternatives of a `oneOf` immediately precede the error of the keyword. An error inside a `$ref` carries the schema path of the referenced document. A key rejected by `propertyNames` yields an error with the field `propertyName`.
- The rule `by_aim` of gnomon was read in `src/gnomon/data/requirements.yml` and `unmet_by_aim` of `src/gnomon/completeness.py` on 2026-10-13: `null`, `[]`, `{}` and `open` count as unfilled.
- The indentation of a new scalar token was read in the source of `CST.createScalarToken` (`node_modules/yaml/dist/parse/cst-scalar.js`, `yaml` 2.9.1): its option `indent` sets the indentation of the content, whereas `CST.setScalarValue` adds two spaces to the indentation of the token for a value after a key. Both write with `lineWidth: -1`, so no value is folded.
- The source ranges of collections were observed on 2026-10-20 with `yaml` 2.9.1, and the [edits of collections](../src/domain/edit/collection-edits.ts) rely on them. The range of a mapping item of a block sequence ends after the line break of its last line. The range of a block sequence includes the comment lines between its items. The range of a flow collection spans its brackets or braces, and excludes any comment after the closing one.

## Decision log

The design decisions and their rationale are recorded in the [architecture decisions](adr/_index.md), and the order of construction in the implementation plan. Five decisions about the work itself are recorded here:

- **One session per milestone**: each session ends on a verified state (exit criterion met, roadmap checked, commit made), so that the next session starts from the repository rather than from a conversation.
- **Synthetic fixtures**: the records of the consumer projects stay outside this public repository.
- **Disposable spike plugin**: a spike that needs a running Obsidian runs in a separate plugin, deleted once its verdict is recorded, so that `src/` holds no spike code.
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
- Every edit of the source text goes through the [plan of commits](../src/domain/edit/commit-plan.ts) and the [commit service](../src/application/commit-service.ts). The commit service confirms each edit by parsing the new text. A commit applies only to the text from which its form model was built, so the [instance session](../src/application/instance-session.ts) queues the scalar commits made while a text loads or fails to parse. The session refuses the structural commits meanwhile, since their positions may designate other items in the new text.
- The [identifiers of items](../src/domain/form/item-identities.ts) belong to the session, and the commit service updates them after each confirmed structural commit. When a new path builds a form model, it must pass the identities of its session; otherwise, the controls of the items lose their state at each rebuild. The draft of a new entry of a keyed mapping keys its nested sequences by the identity of the entry template. Therefore, a control inside such a nested draft is rebuilt once, at its first commit.
- Every field of the [form model](../src/domain/form/model.ts) carries the flag `unfilled`, read by the controls to display an empty control, and by the form to disable a forbidden field only while it is unfilled. When a new path builds fields, it must set that flag from the values of `x-unfilled`.
- The runs recorded in the protocols of saving and of validation predate the corrections. When these protocols are rerun on the current code, the form displays empty controls where their items expect `open`, and schema warnings, since their scenario schemas enumerate `open`.
- The geonexus corpus declares its file types in `specs/vocabulary/file-types.yml` since 2026-10-16, and the [corpus test of validation](../tests/acceptance/corpus-validation.test.ts) reads them there.
- Each refusal reason of the plan is listed in `REFUSALS` of the [plan of commits](../src/domain/edit/commit-plan.ts). The golden test accepts two of them only: a locked value, and a removal that would delete a comment inside a flow collection.
- Prettier must never format `tests/manual/`, since the protocols record the ticks of the user. The command `npm run format` applies the ignore file `config/tools/prettier.ignore`, whereas a direct call of `npx prettier` on a folder does not.
- The simulated DOM `happy-dom` replaces the global class `URL`, so a test module resolves a file path by joining paths, as [the discovery of YAML files](../tests/support/yaml-files.ts) does. The [rendered form](../tests/support/rendered-form.tsx) renders a form through the session of an instance for component tests.
- The gnomon fixtures keep the unfilled value `open` and the keyword `x-unfilled: [open]`, since they reproduce gnomon as it stands. The user decided on 2026-10-20 that gnomon will write empty values (null) as its unfilled value, as a task of the gnomon project. Once gnomon has switched, the fixtures of `tests/fixtures/gnomon/` must drop `x-unfilled: [open]` and use empty values, and the acceptance tests that expect `open` must follow.
