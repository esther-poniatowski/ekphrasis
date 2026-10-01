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
- **Existing schemas**: schemas already written in JSON Schema must work without conversion.

## Options weighed

| Option | Benefit | Cost |
| --- | --- | --- |
| Dedicated form format, modeled on the form schema of GitHub issue forms | Each element carries its label, its instructions and its validations in a short syntax | Programs cannot validate instances with a standard library, and the model holds a flat list of elements, without nesting or conditions |
| JSON Schema, with the presentation in a separate file, as in the UI schemas of form libraries | The schema stays free of extensions | Two files per record type must be kept consistent |
| JSON Schema with keywords prefixed `x-` | One file per record type, standard validators, and existing schemas stay valid | The keywords of ekphrasis are unknown to other tools |

## Consequences

- The validator of ekphrasis must support draft 2020-12 and accept unknown keywords. When a validator rejects unknown keywords by default, it must be configured to accept them, in ekphrasis as in the programs of a project.
- The rules expressed by standard keywords are checked by the programs of a project as well, whereas the rules under the keyword `x-rules` are checked by ekphrasis only.
