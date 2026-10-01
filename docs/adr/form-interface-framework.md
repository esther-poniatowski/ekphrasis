---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Form interface framework
status: accepted
---
# Form interface framework

> [!QUESTION] Goal: which technology builds the controls of the form view and the entries of the outline?

The domain layer computes the form model as plain data, as the [form pipeline](../architecture/form-pipeline.md) describes. The displayed controls must follow that model whenever the file changes, issues arrive or the rows of a table move. The interface technology determines whether the plugin writes this update logic itself or delegates it to a library.

## Decision

The form view and the outline are built with Preact components, written in TSX inside the adapters layer. Each [field kind](../features/field-kinds.md) maps to one component, registered under the name of its kind. A field displayed by a renderer of Obsidian passes its container element to that renderer through a reference, and unloads the Obsidian `Component` of the rendering when the Preact component unmounts.

## Constraints

- **Preserved focus**: when the file changes, the focused control must keep its uncommitted text, as specified for [saving](../features/saving.md).
- **Collections**: an insertion, a removal or a reordering of items and rows must update the affected controls only.
- **Renderers of Obsidian**: Markdown and LaTeX values render through the renderers of Obsidian, which write into a container element and require cleanup, as the decision on [field rendering](field-rendering.md) records.
- **Layer boundaries**: the interface code must remain under the lint rules that enforce the [layers](../architecture/layers.md).
- **Extensibility**: a new field kind must be added by registering one control, without modifying the other controls.

## Options weighed

| Option | Benefit | Cost |
| --- | --- | --- |
| Plain DOM components, built with the DOM helpers of Obsidian | No runtime dependency, and another plugin can register a field kind without a framework | The updates of collections and the preservation of focus must be written and tested by hand, and this code concentrates the risk of the form view |
| Svelte | Declarative templates with keyed blocks and compiled updates, and a guide in the developer documentation of Obsidian | Component files fall outside the current ESLint and TypeScript configuration, so the build needs a compiler plugin, a preprocessor and a separate checker |
| Preact | Declarative components with keyed lists, written in TypeScript and checked by the current ESLint and TypeScript configuration, and JSX compiled by esbuild without a plugin | One runtime dependency, and the developer documentation of Obsidian covers React only, so patterns must be transposed from React |

The form plugins examined split between Svelte and plain DOM, and none of them uses Preact or React, as the survey of their [interface technology](../references/existing-plugins-forms.md#^interface-technology) records. Preact is retained despite this practice, because it keeps the interface under the toolchain that already enforces the layers.

## Consequences

- The package `preact` becomes a runtime dependency. TypeScript and esbuild must compile JSX with the import source `preact`, and the TypeScript, ESLint and Vitest configurations must cover the files with the extension `.tsx`.
- The lint configuration must forbid `preact` in the domain, application and infrastructure layers, as it forbids `obsidian`.
- Each control is keyed by its field. Positional field paths change when items move, so the form model must give each item of a sequence an identifier kept across reorderings.
- Component tests run under Vitest in a simulated DOM, with the testing library of Preact.
- Another plugin that adds a field kind must write a Preact component.
