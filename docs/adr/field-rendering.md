---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Field rendering
status: proposed
---
# Field rendering

> [!QUESTION] Goal: how does the form view render Markdown and LaTeX values?

The [requirement on rendered content](../requirements.md#^rendered-content) calls for Markdown and LaTeX values to display as Obsidian renders them in a note. A form holds many such values, each in a control of its own.

## Decision

A field of kind `markdown-line` or `markdown` renders its value through the Markdown renderer of Obsidian, into the container of its control, as the specification of the [form view](../features/form-view.md) details. The Markdown renderer receives the path of the instance as the source path, so the links of a value resolve from the folder of the instance. A field of kind `latex` renders its value through the math renderer of Obsidian, as a display formula.

## Constraints

- **Fidelity to Obsidian**: a value must display as in a note, including the post-processors registered by other plugins. Only the renderers of Obsidian apply these post-processors.
- **Isolation**: the display of one field must not affect another field, and must be replaceable when its control opens.
- **Link resolution**: the links of a value must resolve as in a note stored in the folder of the instance.

## Options weighed

| Option | Benefit | Cost |
| --- | --- | --- |
| Markdown parser and formula engine bundled with the plugin | Full control of the output, and no dependency on the rendering API of Obsidian | The display diverges from notes, and the post-processors of other plugins never apply |
| Renderers of Obsidian | Values display as in notes, and links resolve from the instance | One call to a renderer per rendered field |

## Consequences

- A form with many rendered fields makes many calls to the renderers. Therefore, the form renders first the fields that enter the visible area.
- The Markdown renderer wraps inline content in a paragraph, so a field of kind `markdown-line` must display that paragraph inline.
