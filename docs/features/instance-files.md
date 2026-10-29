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

A file ending in `.yaml` or `.yml` can hold one YAML record. Ekphrasis registers both extensions in Obsidian. Therefore, these files appear in the file explorer and open in the Ekphrasis view. A schema-bound file opens in the [form view](form-view.md). Because every form derives from a schema, an unbound file opens in the source view. Then, the form view displays three binding routes. They are a logical schema field, a modeline and a path rule. The decision on [plain YAML instances](../adr/plain-yaml-instances.md) establishes the standalone files.

## Extension conflict

Obsidian assigns each extension to the first plugin that registers it, as the [conflict on extensions](../adr/plain-yaml-instances.md#^extension-conflict) records. Therefore, another enabled plugin, such as YAML Editor or YAML Databases, can own `.yaml` or `.yml` before ekphrasis loads. Ekphrasis still loads in that case, and keeps the form reachable by two means:

- a notice states which extensions another plugin owns, and names YAML Editor and YAML Databases as the plugins known to register them;
- the command *Open in ekphrasis* opens the active YAML file in the view of ekphrasis, whichever plugin owns its extension.

The error raised by Obsidian names no owner, so the notice cannot name the plugin actually enabled.

## Schema binding

Ekphrasis binds each record to at most one [schema](schemas.md). Ekphrasis uses the first applicable source:

1. a top-level `_schema` field, whose logical identifier resolves through the configured registry;
2. a modeline comment among the leading comment lines of the file, in the syntax of the YAML language server: `# yaml-language-server: $schema=<path>`;
3. the path rules of the plugin settings, each assigning a schema to the files matched by a glob pattern.

^binding-sources

The registry is a YAML file whose `schemas` mapping relates opaque identifiers to schema paths from the vault root:

```yaml
schema_version: 1
schemas:
  'geonexus:project@1': 'utils/schemas/project.schema.yaml'
```

A record declares the logical identifier rather than the local path:

```yaml
_schema: geonexus:project@1
identity:
  id: example
```

When `_schema` is present, Ekphrasis stops the form pipeline after any of these failures:

- the registry is absent
- the identifier is unknown
- the mapped schema declares a different contract

Ekphrasis does not apply a modeline or path rule after such a failure.

A modeline path resolves from the folder of the record, following the YAML language server. Ekphrasis reads schemas from the vault only. Therefore, a modeline binds no schema when it names a web address or a path outside the vault. The form view reports that path. The record below uses this compatibility route:

```yaml
# yaml-language-server: $schema=../schemas/question.schema.yaml
id: turbulence-intermittency
status: posed
statement: 'Why does the flatness of $\delta u$ grow as the scale decreases?'
```

Because the modeline begins with `#`, a YAML parser ignores it. The YAML language server reads the same line and suggests values outside Obsidian. Path rules suit a project whose folder layout determines the record type of each file. Each rule pairs a glob pattern with a schema path. Both values start from the vault root. The pattern must match the whole file path and admits five constructions:

| Construction | Matched text |
| --- | --- |
| `*` | Any characters inside one folder name or file name |
| `?` | One character inside one name |
| `**`, as a whole segment | Zero or more folders |
| `{a,b}` | Either alternative, which may itself hold braces |
| `[a-z]`, `[!a-z]` | One character inside the class, or outside it |

^glob-syntax

For example, the pattern `**/{glossary,*.glossary}.yml` matches both `glossary.yml` and `terms/pendulum.glossary.yml`. When several path rules match one file, the first matching rule applies. A rule still missing its pattern or its schema binds no file. The decision on [schema binding](../adr/schema-binding.md) compares the three sources.

## Reading by programs

A program reads an instance with any YAML parser, as a single document. However, the instance may be incomplete, since ekphrasis saves every edit. A field not yet filled holds the null value or one of the [unfilled values](schemas.md#^unfilled-values) declared by the schema. Therefore, a program consuming instances must treat these values as absent data.
