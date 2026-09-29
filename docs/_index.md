---
tags:
  - index
aliases:
  - ekphrasis documentation
---
# ekphrasis documentation

The documentation of ekphrasis specifies an Obsidian plugin that renders YAML notes as readable documents. The plugin serves projects that store rich content in YAML.

- [Project overview](overview.md): to decide whether the plugin fits a project that stores rich content in YAML.
- [Requirements](requirements.md): to check a design choice against the properties required of the plugin.
- [Assessment of existing plugins](existing-plugins.md): to know which requirements remain unmet by the plugins already available.
- [User guide](guide/_index.md): to install the plugin and to write YAML notes that render correctly.
- [Features](features/_index.md): to know the syntax accepted in a YAML note and the behaviour of the plugin for each feature.
- [Architecture decisions](adr/_index.md): to know which constraint fixed each design choice, and which change of constraint would reopen the choice.
- [Architecture](architecture/_index.md): to locate the module responsible for a behaviour before changing that behaviour.
- [Agent prompts](prompts/_index.md): to delegate a review or another recurring task on the project to an AI agent.
- [Documentation conventions](documentation-conventions.md): to write a new note and register it in this documentation.
- [Roadmap](../TODO.md): to know which features are implemented and which steps remain open.

Each feature is described by three kinds of note, one per folder:

- a feature note states the syntax and the behaviour;
- a decision record states the constraint that selected this syntax among the alternatives;
- an architecture note states the module that implements the behaviour.
