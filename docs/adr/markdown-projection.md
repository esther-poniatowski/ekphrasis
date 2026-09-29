---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Markdown projection
status: accepted
---
# Markdown projection

> [!QUESTION] Goal: how does the reading mode produce the display of a YAML body?

The display of a YAML body must meet two requirements. First, string values must render as Obsidian renders a note. Second, each key must appear as a distinct element, so that a link can designate that key. The Markdown renderer of Obsidian meets the first requirement. The second requirement depends on the unit of Markdown passed to that renderer in each call.

## Decision

A pure function projects the tree of the body into a sequence of Markdown blocks with a source map. Then, the Markdown renderer of Obsidian renders each block into a container element of its own, as the [rendering pipeline](../architecture/rendering-pipeline.md) details.

## Constraints

- **Fidelity to Obsidian**: the [requirement on rich content](../requirements.md#^rich-content) calls for the output of the Markdown renderer of Obsidian. Only that renderer applies the post-processors of the other plugins.
- **Addressable keys**: the [requirement on atomic references](../requirements.md#^atomic-references) calls for one element of the display per key.
- **Testability**: the projection must run in unit tests, outside Obsidian.

## Options weighed

| Option | Benefit | Cost |
| --- | --- | --- |
| Display built directly, with a dedicated Markdown parser and formula engine | Full control of the structure | The display diverges from Obsidian, and the post-processors of other plugins never apply |
| Single Markdown document rendered in one call | One call to the renderer | The rendered elements carry no trace of their keys, so a key reference cannot be resolved |
| Structure built directly, with one render call per scalar | Each value is addressable | The structure is fixed in display code instead of Markdown, and the number of calls grows with the number of scalars |
| Projection into blocks, with one render call per block | Each key is addressable, and the projection runs without Obsidian | One call to the renderer per block |

## Consequences

- Each structural feature must take a Markdown form: a section becomes a heading, and a correspondence becomes a Markdown table.
- A section spans several blocks, so a section folds through containers nested in the container of its heading.
- The cost of one render call per block motivates a planned measure: the visible blocks of a long YAML note render first.
