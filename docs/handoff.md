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

The milestone *Toolchain and spikes* is complete, and every step is checked in the [roadmap](../TODO.md). Every spike has a recorded verdict, and the spike plugin is retired. Its code remains in the history, in the commit `test: Add spike plugin for Obsidian premises`. Continuous integration has not run yet, so the first push confirms that `npm ci` passes on the committed lock file.

The next milestone is *Bound form*. Each decision record verified by a spike states the constraints that the later milestones must respect: in its section *Verification*, or for the extension conflict in its consequences.

## Environment

- Node 22 is expected, as the version file `.nvmrc` fixes. The dependencies are installed in `node_modules/`.
- The npm cache `~/.npm` holds files owned by root, so `npm install` fails with `EACCES`. Until the user repairs the cache, every npm command that downloads takes the option `--cache` pointing to a folder of the session scratchpad.
- The folder `.obsidian/` at the repository root holds the settings of the user for reading the repository as a vault. It stays uncommitted.
- The prose linter runs through `/Users/eresther/miniconda3/bin/conda run -n hermeneia hermeneia lint <path>`.
- The corpus test reads every YAML file under the folder named by `EKPHRASIS_CORPUS`, for instance `EKPHRASIS_CORPUS=/Users/eresther/Documents/projects/gnomon npm test`.

## Constructs of the consumer projects

The synthetic fixtures of `tests/fixtures/` reproduce the constructs below, and the header comment of each fixture lists the constructs that it covers. Records of the consumer projects are never copied into this public repository: the optional corpus test reads them from the folder named by `EKPHRASIS_CORPUS`, and is skipped when the variable is unset.

**gnomon** (`/Users/eresther/Documents/projects/gnomon/`):

- records with the extension `.yml`, and no JSON Schema: the constraints live in the templates of `src/gnomon/data/templates/`, in the registries `vocabularies.yml` and `requirements.yml`, and in the Python checkers of `src/gnomon/completeness.py` and `src/gnomon/vocabulary.py`;
- the unfilled value `open`, admitted by every closed field, and placeholders in uppercase, sometimes double-quoted;
- prose in single-line quoted scalars, some longer than 400 characters, and LaTeX in single-quoted scalars;
- flow sequences such as `[pop, t]`, and flow mappings such as `{verdict: pending, evidence: ""}`;
- a map `maturity` keyed by dotted field paths, and references such as `system.TOPIC#SYMBOL`;
- the conditional rule `unmet_by_aim`, in which `task.epistemic_aim` decides the required fields;
- the generated file `vocabulary.yml`, which must never be edited.

**geonexus** (`/Users/eresther/Documents/research/geonexus/`):

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

The open decisions are recorded where they are settled: the roadmap steps opening with *decide* or *evaluate*, and the risks of each milestone in the implementation plan. One further question belongs to the first milestone: whether a link checker joins `scripts/`, since the checker used during the documentation work lived in a temporary folder.

## Provenance

- The constructs of the consumer projects come from a read-only survey of both repositories, made on 2026-09-30.
- The interface technology of the form plugins comes from their GitHub repositories, as read on 2026-10-01 and recorded in the [assessment of form plugins](references/existing-plugins-forms.md#^interface-technology).
- The signatures of the Obsidian API were read in `obsidian.d.ts` of the repository `obsidianmd/obsidian-api`, and checked against the installed package `obsidian` 1.13.1: `MarkdownRenderer.render(app, markdown, el, sourcePath, component)`, `renderMath(source, display)` returning an element, `registerExtensions(extensions, viewType)`, and `TextFileView` with `requestSave`.
- The syntax-tree functions of the `yaml` library (`keepSourceTokens`, `CST.setScalarValue`, `CST.stringify`) and the class `Ajv2020` come from their official documentation, and were checked against the declarations of the installed versions (`yaml` 2.9.1, `ajv` 8.20.0, `preact` 11.0.0).

## Decision log

The design decisions and their rationale are recorded in the [architecture decisions](adr/_index.md), and the order of construction in the implementation plan. Five decisions about the work itself are recorded here:

- **One session per milestone**: each session ends on a verified state (exit criterion met, roadmap checked, commit made), so that the next session starts from the repository rather than from a conversation.
- **Synthetic fixtures**: the records of the consumer projects stay outside this public repository.
- **Disposable spike plugin**: a spike that needs a running Obsidian runs in a separate plugin, deleted once its verdict is recorded, so that `src/` holds no spike code.
- **Corpus variable**: the environment variable `EKPHRASIS_CORPUS` names one folder, and several projects can be gathered in it by symbolic links.
- **Spike verdicts in decision records**: each verdict changes the status of its record from proposed to accepted, or reopens the decision before the milestone that depends on it.

## Warnings

- The file `obsidian.d.ts` exceeds the length that web fetching tools process, and their summaries of it have returned invented signatures. Read the file through `gh api -H "Accept: application/vnd.github.raw" repos/obsidianmd/obsidian-api/contents/obsidian.d.ts`, filtered with `grep`.
- The parser adapter `src/infrastructure/yaml-parser.ts` returns an empty node for aliases, so the form model of the milestone *Bound form* must resolve aliases or mark them read-only. The fixture `tests/fixtures/constructs/anchors.yml` holds anchors, aliases and a merge key.
- Saving must respect three constraints found by the spike on byte preservation, as recorded in the [decision on source-preserving writes](adr/source-preserving-writes.md). For instance, filling an empty value requires an insertion after its key.
