---
tags:
  - index
index: "[ekphrasis documentation](docs/_index.md)"
aliases:
  - Architecture
---
# Architecture

The architecture of ekphrasis separates the code that transforms a YAML body into Markdown from the code that connects the result to Obsidian.

- [Layers and dependency rule](layers.md): to place a new module in the layer whose admitted dependencies include every import of the module.
- [Rendering pipeline](rendering-pipeline.md): to trace a rendered block back to the stage that produced that block.
