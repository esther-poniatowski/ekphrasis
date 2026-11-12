# Test protocol: Schema registry

This checklist verifies inside Obsidian the binding of a record by its top-level field `_schema`, resolved through the schema registry named in the settings, as the specification of [instance files](../../../docs/features/instance-files.md#^binding-sources) states:

- the field `_schema` hidden from the form of a bound record;
- the field `_schema` taking precedence over a modeline;
- the failures that stop the binding: a registry file absent, an absent major of a registered format, and a schema declaring another contract;
- a file left unbound, without an error, when no registry is set or when no identifier of the registry names its format;
- a record bound although its text fails to parse;
- a change of the registry reaching an open form;
- the index of identifiers following the registry.

The roadmap step of the schema registry is ticked once these items pass. Each item states an action, then the expected result after the arrow. Tick an item when the result matches, and write any deviation under *Observations*, with the message of the developer console (`Cmd+Option+I`, tab *Console*) when the console shows a message.

> [!TIP] Rule for a failing item
> Record the deviation and continue with the next item. Stop only when the plugin fails to load, since every later item depends on it.

## Setup

The records of this protocol lie in the folder `scenarios/registry` of the test vault:

- `schemas.yml` is the registry. It maps `scenario:registered@1` to `registered.schema.yaml`, and `scenario:mismatch@1` to the same schema, whose `_schema` declares `scenario:registered@1` only;
- `bound.yml` declares `scenario:registered@1` and the identifier `scenario.registered`;
- `precedence.yml` declares `scenario:registered@1`, and holds a modeline naming the schema *Corrections*;
- `unknown.yml` declares `scenario:registered@2`, a major that the registry does not hold;
- `foreign.yml` declares `scenario:absent@1`, a format that no identifier of the registry names;
- `mismatch.yml` declares `scenario:mismatch@1` and the identifier `scenario.mismatch`;
- `late.yml` declares `scenario:late@1`, which the protocol adds to the registry;
- `broken.yml` declares `scenario:registered@1`, and its last line holds an unclosed bracket;
- `registry-links.md` holds two links by identifier.

- [x] Run `npm run build` and `npm run test-vault` from the root of the repository, then restart Obsidian, or disable and enable *Ekphrasis* in *Settings → Community plugins*. → No error notice appears, and the console holds no line starting with `ekphrasis:`.

## No registry set

- [x] Open *Settings → Ekphrasis*. → The setting *Schema registry* is empty.
- [x] Open `scenarios/registry/bound.yml`. → The file opens in the source view, and no message states that a schema is missing, since no registry is set. No form displays, although no path rule or modeline applies.
- [x] Open `scenarios/registry/registry-links.md` in the reading view, and click link 1. → No file opens, and the notice *Ekphrasis: no record of the vault declares the identifier `scenario.registered`.* shows.

## Registry absent

- [x] In *Settings → Ekphrasis*, set *Schema registry* to `scenarios/registry/missing.yml`. Open `scenarios/registry/bound.yml`. → The message *Schema not found* states that the registry `scenarios/registry/missing.yml` is absent.

## Bound record

- [x] Set *Schema registry* to `scenarios/registry/schemas.yml`. Return to `bound.yml`. → The form titled *Registered record* displays, without reloading the file. The line below the title reads *Schema `scenarios/registry/registered.schema.yaml`, resolved from the logical contract.*
- [x] Look at the fields of the form. → The form shows *id* and *Name*, and no field *_schema*. The top of the form reports no issue.
- [x] Change *Name* to `bound and edited`, and press `Tab`. Run *Ekphrasis: Toggle form and source view*. → The source shows `name: bound and edited`, and the line `_schema: scenario:registered@1` unchanged.
- [x] Run *Ekphrasis: Toggle form and source view* again. Open `registry-links.md` in the reading view, and click link 1. → The form of `scenarios/registry/bound.yml` opens.

## Precedence over a modeline

- [x] Open `scenarios/registry/precedence.yml`. → The form titled *Registered record* displays, not the form *Corrections* named by its modeline, and the line below the title names `scenarios/registry/registered.schema.yaml`, resolved from the logical contract.

## Failures of the binding

- [x] Open `scenarios/registry/unknown.yml`. → The message *Schema not found* reads: *The logical contract `scenario:registered@2` cannot be resolved because the schema identifier is absent from the registry, which holds another major of `scenario:registered`.*
- [x] Open `scenarios/registry/foreign.yml`. → The file opens in the source view, and no message states that a schema is missing.
- [x] Open `scenarios/registry/mismatch.yml`. → The message *Schema not loaded* names the schema `scenarios/registry/registered.schema.yaml`, resolved from the logical contract, and states that the registry binds `scenario:mismatch@1` to this schema, but the constant of its `_schema` property is `scenario:registered@1`.
- [x] Open `registry-links.md` in the reading view, and click link 2. → No file opens, and the notice *Ekphrasis: no record of the vault declares the identifier `scenario.mismatch`.* shows, since a record whose contract mismatches enters no index.
- [x] Open `scenarios/registry/broken.yml`. → The message *Invalid YAML* names the line of `name`, and offers to open the source view. No message states that the schema is missing.

## Change of the registry

- [x] Open `scenarios/registry/late.yml`. → The file opens in the source view, and no message states that a schema is missing, since the registry names no major of `scenario:late`.
- [x] Split the pane, and open `scenarios/registry/schemas.yml` in the new pane. Under `schemas:`, add the line `  'scenario:late@1': 'scenarios/registry/late.schema.yaml'`, aligned with the two other entries, and let the file save. → The pane of `late.yml` displays the form titled *Late record*, without reopening the file, and the line below the title names `scenarios/registry/late.schema.yaml`.

## Reset

To restore the records and the settings, run `npm run test-vault` from the root of the repository: it copies the scenario records afresh, and restores the setting *Schema registry* to empty.

## Observations

### Run 1

### Run 2 — 2026-11-11

The run tested commit `854ed26`, built in a separate worktree, in Obsidian 1.15.0. Every item passed except the second item of *No registry set*. During the whole run, the console held no line starting with `ekphrasis:`.

- *No registry set*, item 2, deviated: `scenarios/registry/bound.yml` opens in the source view, and no message displays. The console shows no message. Since commit `98a2ff2`, released in 0.2.0, the binding leaves a well-formed `_schema` unbound when no registry is configured, as the [ADR of schema binding](../../../docs/adr/schema-binding.md) states. The plugin therefore follows its specification, and the expected result of this item predates the rule. Commit `854ed26` does not cause the deviation. After this run, the expected result of the item was restated to the specified behaviour. The observation above matches the restated result. The owner accepted this observation on 2026-11-12, so the item is ticked on Run 2.
- *Failures of the binding*, item 1, passed: `unknown.yml` shows *Schema not found*, which reads: *The logical contract `scenario:registered@2` cannot be resolved because the schema identifier is absent from the registry, which holds another major of `scenario:registered`.*
- *Failures of the binding*, item 2, passed: `foreign.yml` opens in the source view, without a message.
- *Change of the registry*, item 1, passed: `late.yml` opens in the source view, without a message.
- *Change of the registry*, item 2, passed: once the entry of `scenario:late@1` is saved, the pane of `late.yml` displays the form *Late record*, without reopening the file, and the line below the title reads *Schema `scenarios/registry/late.schema.yaml`, resolved from the logical contract.*

Notes:

- In item 2 of *Change of the registry*, the automatic indentation of the editor first placed the new entry at four spaces. The pane of `late.yml` then showed *Schema not found*, which read: *The logical contract `scenario:late@1` cannot be resolved because the registry `scenarios/registry/schemas.yml` is invalid YAML.* Once the entry was aligned at two spaces, the form *Late record* displayed. The error came from the operator, and the message of an invalid registry reached the open pane as expected.
- In the messages of *Registry absent* and of `unknown.yml`, the backticks around `scenarios/registry/missing.yml` and around `scenario:registered` display as literal characters, whereas the logical contract displays in a code font.
