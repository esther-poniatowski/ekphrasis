---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Presentation in view specifications
status: proposed
---
# Presentation in view specifications

> [!QUESTION] Goal: where is the presentation of the keys of a YAML note declared?

The [requirement on customizable presentation](../requirements.md#^customizable-presentation) keeps presentation apart from data, but does not fix the file that carries the presentation. The decision on [YAML data in notes](yaml-note-container.md) reopens that question, since YAML Editor no longer applies to the data.

## Decision

Presentation is declared in view specifications. Each view specification is a YAML note of its own. A YAML note selects its view specification by a link in its frontmatter, or inherits it through a folder rule of the settings. Both routes follow the selection rules of [view specifications](../features/view-specifications.md).

## Constraints

- **Unchanged data**: a change of presentation must leave the data unchanged.
- **Reuse**: one declaration must serve every YAML note of a family.
- **Machine readability**: the declaration must not introduce syntax rejected by a standard YAML parser.
- **Navigation**: a YAML note must link its presentation, so that an author reaches the presentation from the data.

## Options weighed

| Option | Benefit | Cost |
| --- | --- | --- |
| Custom keywords in JSON Schema files, shared with YAML Editor | A single file would drive both completion and presentation | YAML Editor does not act on the body of a YAML note, so the shared files would drive the completion of no YAML note. A JSON Schema file is also not a note |
| Presentation keys in the frontmatter of each YAML note | The declaration stands next to the data | Each note repeats the declaration, so a family of notes cannot share it |
| YAML tags on values, such as a tag for Markdown | The declaration stands at the value | The data changes, and the safe loader of PyYAML rejects unknown tags |
| View specification notes, selected by a frontmatter link or by a folder rule | One declaration serves a family, and it is linked, indexed and rendered as a note | One more note must be maintained per family of YAML notes |

## Consequences

- The JSON Schema annotations of the design that preceded YAML notes are abandoned. The schema file of the example vault must be converted into a view specification, as the [roadmap](../../TODO.md) records.
- The application layer selects one view specification per YAML note, from the frontmatter link or else from the folder rules. The selected view specification precedes the default presentation in the chain of specification sources.
- Within a view specification, the first matching rule applies, so the order of the rules decides between two patterns that match the same key.
