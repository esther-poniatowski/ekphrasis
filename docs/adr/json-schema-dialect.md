---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Schema dialect
status: accepted
---
# Schema dialect

> [!QUESTION] Goal: in which language does a schema declare a record type?

A schema declares the structure, the presentation and the rules of a record type. The language of the schema decides which tools, besides ekphrasis, can read the schema and validate the instances.

## Decision

A schema is written in JSON Schema, draft 2020-12, in JSON or in YAML, and extended by keywords prefixed `x-`, as the specification of [schemas](../features/schemas.md) details.

## Constraints

- **Single declaration**: the structure, the presentation and the rules of a record type must be declared in one file.
- **Reuse by programs**: the programs of a project must validate instances against the same schema, through standard libraries in Python and in JavaScript.
- **Expressivity**: the language must express nested structures, required, optional and conditional fields, default values, patterns and ranges.

## Options weighed

| Option | Benefit | Cost |
| --- | --- | --- |
| Dedicated form format, modeled on the form schema of GitHub issue forms | Each element carries its label, its instructions and its validations in a short syntax | Programs cannot validate instances with a standard library, and the model holds a flat list of elements, without nesting or conditions |
| JSON Schema, with the presentation in a separate file, as in the UI schemas of form libraries | The schema stays free of extensions | Two files per record type must be kept consistent |
| JSON Schema with keywords prefixed `x-` | One file per record type, and standard validators | The keywords of ekphrasis are unknown to other tools |

## Consequences

- The validator of ekphrasis must support draft 2020-12 and accept unknown keywords. When a validator rejects unknown keywords by default, it must be configured to accept them, in ekphrasis as in the programs of a project.
- The rules expressed by standard keywords are checked by the programs of a project as well, whereas the rules under the keyword `x-rules` are checked by ekphrasis only.

## Verification

The decision holds inside Obsidian with Ajv, the validator for draft 2020-12 added to the dependencies, as the spike on Ajv confirmed on 2026-10-01. Three results of the spike bear on the decision:

- In strict mode, Ajv rejects the keyword `x-checks` as unknown. Therefore, ekphrasis must create the validator with the option `strictSchema` disabled.
- With `strictSchema` disabled, Ajv compiles the glossary schema of geonexus in 11.5 ms, after registering the three other schemas of its folder. Therefore, Obsidian admits the code that Ajv generates to compile a schema.
- On the synthetic glossary, the unfilled placeholder of one field yields four errors at the same instance path: one per rejected alternative of a `oneOf`, and one for the `oneOf` itself.

Therefore, the milestone *Validation* must merge the errors of one `oneOf` into one issue per field path. Moreover, an unfilled value must be reported as missing before these errors, as the order of checks requires.

The milestone *Validation* meets these constraints in the [validation service](../../src/application/validation-service.ts) and the [conversion of validator errors](../../src/domain/validation/validator-errors.ts):

- the option `strict` of the [Ajv validator](../../src/infrastructure/schema/ajv-validator.ts) is disabled, and with it `strictSchema` and the other strict checks of Ajv;
- the errors of the alternatives of one `oneOf` merge into one issue, and its message lists the admitted values when each alternative fixes a value by `const`;
- the unfilled entries are removed from the value given to Ajv, so an unfilled required field fails the keyword `required` only, and is reported as missing.

The [acceptance test of validation](../../tests/acceptance/validation.test.ts) verifies the merge on the placeholder of the glossary fixture: one issue replaces the four errors of the spike.
