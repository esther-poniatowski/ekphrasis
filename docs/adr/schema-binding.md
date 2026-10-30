---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Schema binding
status: accepted
---
# Schema binding

> [!QUESTION] Goal: how does ekphrasis find the schema of an instance?

The schema determines the form, the skeleton and the checks. Therefore, Ekphrasis must select the schema before opening a record as a form. Each served project chooses one of three sources. The record can declare a logical identifier or a modeline. Otherwise, the vault can impose a path pattern.

## Decision

Ekphrasis first resolves a top-level `_schema` field through a configured registry. When that field is absent, a modeline names the schema. If the record has neither field nor modeline, the first matching path rule names the schema. The [binding sources](../features/instance-files.md#^binding-sources) record this order.

## Constraints

- **Explicit data**: a canonical record contract must be readable by every consumer.
- **Portable files**: a moved instance must keep its schema contract.
- **Stable identity**: the contract identifier must not depend on the local path of the schema.
- **Existing layouts**: a project whose folder layout already determines the record type must not have to edit its files.
- **Interoperability**: the binding should be readable by YAML tools outside Obsidian.

## Options weighed

| Option | Benefit | Cost |
| --- | --- | --- |
| Logical `_schema` resolved through a registry | Programs share one portable identity, whereas each vault selects a local path | The vault must generate and configure a registry |
| Modeline comment `# yaml-language-server: $schema=<path>` | The file carries a path that the YAML language server also reads | A move can invalidate the relative path, and a tool that rewrites comments can remove it |
| Key of the data naming the record type, such as `type` | Many records already carry such a key | The name of the key and its values differ between projects, so each project needs a mapping in the settings |
| Path rules in the settings | The files carry no line for the binding | A file moved to another folder loses its schema, and the binding is stored outside the project |
| `_schema`, modeline, then path rules | Canonical records carry a stable contract, whereas existing layouts retain compatibility | Three routes require explicit precedence |

## Consequences

- If the registry does not map a declared `_schema` value, Ekphrasis reports an error. Ekphrasis does not fall back to another source.
- Ekphrasis verifies that the mapped schema declares the same value as the constant of its root `_schema` property.
- Ekphrasis omits the reserved root property from the content form.
- The modeline and path rules remain available to files without `_schema`.
- The command *Create instance* writes a modeline only when no path rule binds the new path.
- A registry may map to a schema in `.schema-resources/`. Obsidian omits this hidden subtree from its indexed files. Therefore, the vault adapter must use its low-level reader for this subtree alone. The fallback admits no other hidden path. ^hidden-schema-resources
