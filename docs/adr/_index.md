---
tags:
  - index
index: "[ekphrasis documentation](docs/_index.md)"
aliases:
  - Architecture decisions
---
# Architecture decisions

Records the design choices of ekphrasis, each binding on every later change of the code

- [Plain YAML instances](plain-yaml-instances.md): explains why instances are standalone YAML files rather than notes
- [Schema binding](schema-binding.md): explains why a modeline comment, and else a path rule, selects the schema of an instance
- [Schema dialect](json-schema-dialect.md): explains why schemas are written in JSON Schema with keywords prefixed `x-`, rather than in a dedicated form format
- [Source-preserving writes](source-preserving-writes.md): explains why a commit splices text into the source range of the edited node
- [Python checkers](python-checkers.md): explains why custom checkers run in one persistent Python process, on desktop only
- [Source view](source-view.md): explains why the YAML text is edited in an editor supplied by ekphrasis
- [Field rendering](field-rendering.md): explains why Markdown and LaTeX values render through the renderers of Obsidian
- [List layouts](list-layouts.md): fixes the initial layout of a list and the lifetime of a manual choice
- [Form interface framework](form-interface-framework.md): explains why the form view and the outline are built with Preact, rather than with plain DOM components or Svelte
- [Record identifiers](record-identifiers.md): weighs how a link designates a record by its identifier
