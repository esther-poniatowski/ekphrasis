---
tags:
  - architecture
index: "[Architecture](docs/architecture/_index.md)"
aliases:
  - Form pipeline
---
# Form pipeline

The form pipeline turns the text of an instance into a form, and turns each commit of the form back into text. Opening an instance, or any change of its file, runs five stages, each taking the output of its predecessor:

1. **Parsing** converts the text into a tree that keeps the source range, the scalar style and the comments of each node.
2. **Binding** resolves the schema of the instance, from its modeline or else from the path rules, and loads the schema with its references.
3. **Modelling** combines the schema and the tree into the form model: one field per property of the schema, holding its kind, its rules, its field path and, when the file contains it, its node.
4. **Validation** attaches the issues of the checks to the fields of the model.
5. **Presentation** builds the controls of the form view and the entries of the outline from the model.

A commit runs three further stages, after which the form model is rebuilt from the new text:

1. The domain plans the edits of the source text: the place of each edit, and the scalar style and the indentation of each written value.
2. The infrastructure writes the text of each scalar and splices it. The application then parses the new text, and compares its document with the document that the domain expects, as the decision on [source-preserving writes](../adr/source-preserving-writes.md) requires.
3. The adapters write the confirmed text through the vault. The model is rebuilt from the parsed document with the schemas already loaded, so the next commit applies to the new text at once.

Only presentation and writing depend on Obsidian.

## Form model

The form model is a pure function of the schema and the tree, so unit tests build it without Obsidian. Each field of the model records its [field path](../features/field-paths.md) and the source range of its node. Therefore, a control, an issue and an entry of the outline refer to the same field through the same path.

## Timing of validation

The unfilled values, the standard keywords and the predefined checkers are checked within the plugin at each commit. The custom checkers run in the Python process, and their issues join the model when they return. A result computed for a text already superseded by a later commit is discarded.
