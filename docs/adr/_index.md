---
tags:
  - index
index: "[ekphrasis documentation](docs/_index.md)"
aliases:
  - Architecture decisions
---
# Architecture decisions

Each architecture decision record fixes one design choice, binding on every subsequent change of the code. To let a reader tell whether a changed constraint reopens the choice, each record states three elements:

- the constraints that forced the choice;
- the options weighed against these constraints;
- the consequences of the choice.

Eight records are registered:

- [Plain YAML instances](plain-yaml-instances.md): explains why instances are standalone YAML files rather than notes
- [Schema binding](schema-binding.md): explains why a modeline comment, and else a path rule, selects the schema of an instance
- [Schema dialect](json-schema-dialect.md): explains why schemas are written in JSON Schema with keywords prefixed `x-`, rather than in a dedicated form format
- [Source-preserving writes](source-preserving-writes.md): explains why a commit splices text into the source range of the edited node
- [Python checkers](python-checkers.md): explains why custom checkers run in one persistent Python process, on desktop only
- [Source view](source-view.md): explains why the YAML text is edited in an editor supplied by ekphrasis
- [Field rendering](field-rendering.md): explains why Markdown and LaTeX values render through the renderers of Obsidian
- [Form interface framework](form-interface-framework.md): explains why the form view and the outline are built with Preact, rather than with plain DOM components or Svelte
