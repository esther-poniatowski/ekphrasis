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

The milestones *Bound form* and *Saving of scalars* are complete, and every step of both is checked in the [roadmap](../TODO.md). The repository is published at `https://github.com/esther-poniatowski/ekphrasis`.

The milestone *Validation* is implemented, and awaits its manual check. Three of its six steps are checked in the roadmap, and three stay open:

- the display of issues and the command *Validate instance* stay open until the [protocol of validation](../tests/manual/protocols/validation.md) passes inside Obsidian. The user runs it in the test vault, already built by `npm run test-vault`;
- the evaluation of checkers for the rule families shared across files stays open: the [implementation plan](architecture/implementation-plan.md) recommends a milestone *Rules across files* after *Custom checkers*. That milestone awaits the decision of the user.

The exit criterion of *Validation* is verified by the [acceptance test of validation](../tests/acceptance/validation.test.ts). The question fixture expresses the rule `by_aim` of gnomon by rules `required-when`, and each aim reports exactly the unfilled fields that it requires. The [corpus test of validation](../tests/acceptance/corpus-validation.test.ts) compares the same rule with the registry of gnomon on its question records, and validates the records of geonexus against their schemas.

The next step is the run of the protocol of validation. Once it passes, its two steps are checked, and the next milestone is *Collections*.

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

The open decisions are recorded where they are settled: the roadmap steps opening with *decide* or *evaluate*, and the risks of each milestone in the implementation plan. Two further questions await the user:

- whether a link checker joins `scripts/`, since the checker used during the documentation work lived in a temporary folder;
- whether to add the milestone *Rules across files*, recommended by the implementation plan for references, uniqueness across files and acyclicity.

## Provenance

- The constructs of the consumer projects come from a read-only survey of both repositories, made on 2026-09-30.
- The interface technology of the form plugins comes from their GitHub repositories, as read on 2026-10-01 and recorded in the [assessment of form plugins](references/existing-plugins-forms.md#^interface-technology).
- The signatures of the Obsidian API were read in `obsidian.d.ts` of the repository `obsidianmd/obsidian-api`, and checked against the installed package `obsidian` 1.13.1: `MarkdownRenderer.render(app, markdown, el, sourcePath, component)`, `renderMath(source, display)` returning an element, `registerExtensions(extensions, viewType)`, and `TextFileView` with `requestSave`.
- The packages that Obsidian supplies at run time, named as external by the bundler, come from the esbuild configuration of the repository `obsidianmd/obsidian-sample-plugin`, as read on 2026-10-01.
- The syntax-tree functions of the `yaml` library (`keepSourceTokens`, `CST.setScalarValue`, `CST.stringify`) and the class `Ajv2020` come from their official documentation, and were checked against the declarations of the installed versions (`yaml` 2.9.1, `ajv` 8.20.0, `preact` 11.0.0).
- The order of the errors of Ajv (`ajv` 8.20.0) was observed on 2026-10-13, with three results. The errors of the alternatives of a `oneOf` immediately precede the error of the keyword. An error inside a `$ref` carries the schema path of the referenced document. A key rejected by `propertyNames` yields an error with the field `propertyName`.
- The rule `by_aim` of gnomon was read in `src/gnomon/data/requirements.yml` and `unmet_by_aim` of `src/gnomon/completeness.py` on 2026-10-13: `null`, `[]`, `{}` and `open` count as unfilled.
- The indentation of a new scalar token was read in the source of `CST.createScalarToken` (`node_modules/yaml/dist/parse/cst-scalar.js`, `yaml` 2.9.1): its option `indent` sets the indentation of the content, whereas `CST.setScalarValue` adds two spaces to the indentation of the token for a value after a key. Both write with `lineWidth: -1`, so no value is folded.

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
- Every edit of the source text goes through the [plan of commits](../src/domain/edit/commit-plan.ts) and the [commit service](../src/application/commit-service.ts). The commit service confirms each edit by parsing the new text. A commit applies only to the text from which its form model was built, so the [instance session](../src/application/instance-session.ts) queues the commits made while a text loads or fails to parse. The milestone *Collections* must extend the plan, and keep these two paths.
- The plan refuses two edits until the milestone *Collections*: adding or removing a key of a flow mapping, and clearing an item. Each refusal reason is listed in `REFUSALS` of the plan, and the golden test accepts only those reasons.
