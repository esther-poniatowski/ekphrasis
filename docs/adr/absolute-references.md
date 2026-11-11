---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Absolute references
status: accepted
---
# Absolute references

> [!QUESTION] Goal: how does ekphrasis find the schema file designated by a `$ref` written as an absolute URI?

A schema can compose the base schema published by another project through an absolute `$ref`, such as `https://example.org/tool/note@1/base.schema.yaml`. The registry records the exact vault path of that schema; the URI does not name a vault path. Previously, an absolute `$ref` resolved only if the target schema was already loaded.

## Decision

An absolute `$ref` resolves through the key `resources` of the configured [schema registry](../features/instance-files.md#^binding-sources), as the specification of [schemas](../features/schemas.md#^absolute-references) details:

1. A current registry starts with `_schema: kleisis:schema-registry@2`. Its top-level key `resources` relates each absolute `$id`, exactly as written, to the vault path of its schema. A legacy registry starts with `schema_version`; the form marked `1` omits `resources`.
2. The loader compares the URI of a `$ref`, without its fragment, with the keys of `resources` as exact strings. The loader then reads the mapped file, and the files reached by the references of that file.
3. The root `$id` of the mapped file must equal the URI.
4. A URI that the registry does not map still resolves when a loaded file declares it as its root `$id`. Otherwise the loader reports the URI, the referring file, and the reason: the URI is unmapped, no registry is configured, or the registry cannot be read.
5. The loader never fetches a URI over the network, and rejects a mapped path that names a web address or leaves the vault.

## Constraints

- **Form without network**: the form view must open offline and on mobile, where the [custom checkers](python-checkers.md) are already unavailable.
- **Pinned closures**: a schema composed from another project must resolve to the bytes that the vault pins, never to the bytes returned by a server when the form opens.
- **Shared format**: the provisioning tool Kleisis writes the registry, and Ekphrasis reads it. Both must agree on the name of the key, its top-level placement, and the comparison of URIs as exact strings.
- **Vault boundary**: ekphrasis reads schemas from the vault only, as the [binding sources](../features/instance-files.md#^binding-sources) require.
- **Logical identity**: the identifier of a schema must not depend on its local path, as for the contracts of the [schema binding](schema-binding.md).

## Options weighed

| Option | Benefit | Cost |
| --- | --- | --- |
| Key `resources` of the registry, version 2 | One file, written by Kleisis from the closure that it materializes, maps both the contracts and the resources | Readers must accept two versions of the registry |
| Fetch of the URI over the network | Needs no mapping | Fails offline and on mobile, and returns bytes that the vault does not pin |
| Scan of every schema file of the vault for its `$id` | Needs no registry entry | Reads every schema of the vault before opening a form; two files declaring one `$id` resolve by the order of the scan |
| Map from URI prefixes to folders | One entry covers a whole source | Departs from the comparison as exact strings, and assumes that the layout of the folder follows the path of the URI |
| Map in the settings of the plugin | Leaves the registry format unchanged | Each vault repeats a map that Kleisis already computes, outside the project |

The fallback on a loaded `$id` follows JSON Schema, in which a validator resolves an absolute reference against every schema registered under that `$id`. The fallback also keeps the schemas accepted by version 0.1.1.

## Consequences

- The registry reader of the application layer serves both the binding by `_schema` and the loader, through the port `SchemaResources`. A guarded loader reads the registry once at the start of each load, then admits only mapped files and the relative references reached from those files.
- A registry of version 1 that declares `resources`, a version other than 1 or 2, or a key of `resources` other than an absolute URI makes the registry invalid.
- The registry consulted by a load becomes a dependency of its schema set. Therefore, a change of the registry reopens the forms and reindexes the records whose schemas it resolves, for every binding source.
- A file mapped to a URI may itself hold relative references, resolved from its own folder, and absolute references, resolved through the same registry.
- The validator receives every document under the URI derived from its vault path, as before. An absolute `$ref` is rewritten to the document that the loader resolved, so Ajv and the form read the same schema.

## Verification

The [loader tests](../../tests/infrastructure/schema/schema-loader.test.ts) plant each rule and each failure. A base schema of another folder loads with its closure. An unmapped URI, a registry of version 1, and an absent or unconfigured registry each fail with their reason. A mapped path outside the vault or naming a web address, and a mapped file declaring another `$id`, fail as well. The [registry tests](../../tests/domain/binding/registry.test.ts) cover the two versions and each malformed registry. The [form service tests](../../tests/application/form-service.test.ts) open a record whose root schema composes such a base, and validate it with Ajv.
