---
tags:
  - index
aliases:
  - ekphrasis documentation
---
# ekphrasis documentation

The documentation of ekphrasis specifies an Obsidian plugin that fills YAML records through forms generated from JSON Schemas. The plugin serves projects that record their specifications in YAML files.

- [Project overview](overview.md): to decide whether the plugin fits a project that fills YAML records against schemas.
- [Requirements](requirements.md): to check a design choice against the properties required of the plugin.
- [Existing plugins](references/_index.md): to know which requirements remain unmet by the plugins already available.
- [User guide](guide/_index.md): to install the plugin, fill records through forms, and write the schemas of these records.
- [Features](features/_index.md): to know the syntax accepted in a schema or an instance, and the behaviour of the plugin for each feature.
- [Architecture decisions](adr/_index.md): to know which constraint fixed each design choice, and which change of constraint would reopen the choice.
- [Architecture](architecture/_index.md): to locate the module responsible for a behaviour before changing that behaviour.
- [Agent prompts](prompts/_index.md): to delegate a review or another recurring task on the project to an AI agent.
- [Documentation conventions](documentation-conventions.md): to write a new note and register it in this documentation.
- [Roadmap](../TODO.md): to know which features are implemented and which steps remain open.
- [Handoff](handoff.md): to resume the implementation in a new agent session, with the state, constraints and facts left by the previous session.

A feature can be described by three kinds of note, one per folder:

- a feature note states the syntax and the behaviour;
- a decision record states the constraint that selected this syntax among the alternatives;
- an architecture note states the module that implements the behaviour.
