---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - YAML instances
---
# YAML instances

An instance is a YAML file holding one record of a schema, which ekphrasis opens as a form. The instance remains an ordinary YAML file, as the [requirement on machine readability](../requirements.md#^machine-readability) demands, so programs read it without preprocessing.

## Files

An instance is a file with the extension `.yaml` or `.yml`, holding one YAML document. Ekphrasis registers both extensions in Obsidian, so these files appear in the file explorer and open in the view of ekphrasis. A file bound to a schema opens in the [form view](form-view.md). A file bound to no schema opens in the source view, since every form derives from a schema. The choice of standalone files is recorded in the decision on [plain YAML instances](../adr/plain-yaml-instances.md).

## Extension conflict

Obsidian assigns each extension to the first plugin that registers it, as the [conflict on extensions](../adr/plain-yaml-instances.md#^extension-conflict) records. Therefore, another enabled plugin, such as YAML Editor or YAML Databases, can own `.yaml` or `.yml` before ekphrasis loads. Ekphrasis still loads in that case, and keeps the form reachable by two means:

- a notice states which extensions another plugin owns, and names YAML Editor and YAML Databases as the plugins known to register them;
- the command *Open in ekphrasis* opens the active YAML file in the view of ekphrasis, whichever plugin owns its extension.

The error raised by Obsidian names no owner, so the notice cannot name the plugin actually enabled.

## Schema binding

Each instance is bound to at most one [schema](schemas.md), taken from the first of two sources that names a schema:

1. a modeline comment among the leading comment lines of the file, in the syntax of the YAML language server: `# yaml-language-server: $schema=<path>`;
2. the path rules of the plugin settings, each assigning a schema to the files matched by a glob pattern.

^binding-sources

The path in a modeline is resolved from the folder of the instance, as the YAML language server resolves it. When several path rules match one file, the first matching rule in the order of the settings applies. The instance below is bound to its schema by a modeline:

```yaml
# yaml-language-server: $schema=../schemas/question.schema.yaml
id: turbulence-intermittency
status: posed
statement: 'Why does the flatness of $\delta u$ grow as the scale decreases?'
```

The modeline is a comment, so a YAML parser ignores it and the data stays unchanged. Editors running the YAML language server read the same line, so the schema also drives completion outside Obsidian. Path rules suit a project whose folder layout already determines the record type of each file, since they require no line in the files. The two sources are weighed in the decision on [schema binding](../adr/schema-binding.md).

## Reading by programs

A program reads an instance with any YAML parser, as a single document. However, the instance may be incomplete, since ekphrasis saves every edit. A field not yet filled holds the null value or one of the [unfilled values](schemas.md#^unfilled-values) declared by the schema. Therefore, a program consuming instances must treat these values as absent data.
