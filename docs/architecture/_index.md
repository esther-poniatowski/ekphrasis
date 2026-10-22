---
tags:
  - index
index: "[ekphrasis documentation](docs/_index.md)"
aliases:
  - Architecture
---
# Architecture

Describes the architecture of ekphrasis, in which the code building and editing the form model stays apart from the code connecting the form to Obsidian

- [Layers and dependency rule](layers.md): places each module in the layer whose admitted dependencies cover its imports
- [Form pipeline](form-pipeline.md): traces a control of the form, or a change of the file, back to the stage that produced it
- [Implementation plan](implementation-plan.md): orders the construction of the plugin into milestones
