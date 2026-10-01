---
tags:
  - index
index: "[ekphrasis documentation](docs/_index.md)"
aliases:
  - Architecture
---
# Architecture

The architecture of ekphrasis separates the code that builds and edits the form model from the code that connects the form to Obsidian. The notes describe the target architecture, whereas the [roadmap](../../TODO.md) records which modules exist.

- [Layers and dependency rule](layers.md): to place a new module in the layer whose admitted dependencies include every import of the module.
- [Form pipeline](form-pipeline.md): to trace a control of the form, or a change of the file, back to the stage that produced it.
- [Implementation plan](implementation-plan.md): to know the order of the milestones, the modules created by each milestone, and the criterion that completes it.
