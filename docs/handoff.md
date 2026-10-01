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

The documentation specifies the target design in full, and no code of that design exists yet. The current code implements the earlier reading renderer, and retiring that code is the third step of the first milestone.

The next milestone is *Toolchain and spikes*. Its steps divide by who can perform them:

- **Agent alone**: the tooling steps, the fixtures with the optional corpus test, and the spike on byte preservation, which runs as a unit test.
- **Agent with the user**: the four spikes that need a running Obsidian (extension conflict, Ajv inside Obsidian, rendering time, Python process). The agent writes the spike code and step-by-step instructions, the user runs them in a test vault, and the agent records each verdict in the decision record named by the plan.

The tooling steps come first, since every spike needs a build.

## Environment

- Node 22 is expected, as the version file `.nvmrc` fixes. No `node_modules` folder and no lock file exist, so the step `npm ci` of continuous integration fails until a lock file is committed.
- The first `npm install` changes the environment, so it requires the approval of the user.
- The scaffolding of the project has never been committed: `package.json`, `manifest.json`, `tsconfig.json`, `src/`, `tests/`, `config/`, `scripts/` and the example vault are untracked. Committing them is a separate commit, to be agreed with the user before the first code commit.
- The prose linter runs through `/Users/eresther/miniconda3/bin/conda run -n hermeneia hermeneia lint <path>`.

## Constructs of the consumer projects

The fixtures must reproduce the constructs below in synthetic records. Records of the consumer projects are never copied into this public repository: the optional corpus test reads them from a folder named by an environment variable, and is skipped when the variable is unset.

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
- **Changelog**: the unreleased section lists the reading view as added, so retiring the renderer must update `CHANGELOG.md`.

## Open questions

The open decisions are recorded where they are settled: the roadmap steps opening with *decide* or *evaluate*, and the risks of each milestone in the implementation plan. Two further questions belong to the first milestone:

- the name of the environment variable that locates the corpus;
- whether a link checker joins `scripts/`, since the checker used during the documentation work lived in a temporary folder.

## Provenance

- The constructs of the consumer projects come from a read-only survey of both repositories, made on 2026-09-30.
- The interface technology of the form plugins comes from their GitHub repositories, as read on 2026-10-01 and recorded in the [assessment of form plugins](references/existing-plugins-forms.md#^interface-technology).
- The signatures of the Obsidian API were read in `obsidian.d.ts` of the repository `obsidianmd/obsidian-api`: `MarkdownRenderer.render(app, markdown, el, sourcePath, component)`, `renderMath(source, display)` returning an element, `registerExtensions(extensions, viewType)`, and `TextFileView` with `requestSave`.
- The syntax-tree functions of the `yaml` library (`keepSourceTokens`, `CST.setScalarValue`, `CST.stringify`) and the class `Ajv2020` come from their official documentation.

## Decision log

The design decisions and their rationale are recorded in the [architecture decisions](adr/_index.md), and the order of construction in the implementation plan. Three decisions about the work itself are recorded here:

- **One session per milestone**: each session ends on a verified state (exit criterion met, roadmap checked, commit made), so that the next session starts from the repository rather than from a conversation.
- **Synthetic fixtures**: the records of the consumer projects stay outside this public repository.
- **Spike verdicts in decision records**: each verdict changes the status of its record from proposed to accepted, or reopens the decision before the milestone that depends on it.

## Warnings

- The file `obsidian.d.ts` exceeds the length that web fetching tools process, and their summaries of it have returned invented signatures. Read the file through `gh api -H "Accept: application/vnd.github.raw" repos/obsidianmd/obsidian-api/contents/obsidian.d.ts`, filtered with `grep`.
- The parser of the current code returns an empty node for aliases. A fixture with YAML anchors and aliases must therefore be part of the spike on byte preservation.
