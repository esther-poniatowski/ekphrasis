---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Field rendering
status: accepted
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

- A form with many rendered fields makes many calls to the renderers, and each call blocks input for a few milliseconds. Therefore, the form renders first the fields that enter the visible area, in batches that yield to input between them.
- The Markdown renderer wraps inline content in a paragraph, so a field of kind `markdown-line` must display that paragraph inline.

## Verification

The decision holds, as the spike on rendering time measured on 2026-10-01 in a test vault. One view rendered 100 Markdown values and 100 display formulas. Each value had a Preact component of its own, which passed its container to a renderer of Obsidian. Three runs gave three results:

- The 200 values rendered within 430 to 590 ms per run, about 2 to 3 ms per value.
- Each run held two long tasks, matching its two phases: the formulas blocked input for 180 to 240 ms, and the Markdown values for 240 to 340 ms.
- MathJax loaded in 37 ms at its first use in a session, and in about 2 ms afterwards.

Therefore, the form view must not render all its values in one task. A batch of about fifteen values keeps each task under 50 ms, the duration beyond which the browser counts a task as blocking input. The spike used short synthetic values on one computer, without the post-processors of other plugins. Therefore, the size of a batch must be adjusted on the records of the consumer projects, where some prose values exceed 400 characters.

The form view adds a budget of time to the count, as the [rendering in batches](../features/form-view.md#^batched-rendering) specifies: a batch ends after fifteen values, or once 40 ms have elapsed. Therefore, a batch of long values ends before it blocks input, whatever the size of the batch. The records of the consumer projects were measured on 2026-10-20, outside Obsidian, with two results:

- The longest question record of gnomon holds 52 string values, the longest of 339 characters. At the measured cost per value, its rendered values fill about four batches.
- The glossaries of geonexus render no value, since their schemas declare no rendered kind.

The cost of a long value inside Obsidian, with the post-processors of other plugins, is observed in the [protocol of guidance and navigation](../../tests/manual/protocols/guidance-navigation.md), since the form reports each batch longer than 50 ms in the developer console.
