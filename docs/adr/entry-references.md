---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Entry references
status: proposed
---
# Entry references

> [!QUESTION] Goal: how does a schema declare a field whose value names an entry of another record, and how does the form suggest and check that value?

A record often names an entry declared by another record: a task names one of the streams that a catalog declares as the keys of a mapping, or a meeting names one of the members that a team lists with an identifier field. Without support, such a field is a plain text, so the author must look up the admitted identifiers and a misspelt identifier stays unnoticed until a program reads the record. The [index of record identifiers](record-identifiers.md) already reads every YAML file of the vault through its binding, but it keeps one identifier per file only.

## Decision

The record proposes five choices. Its status stays `proposed` until the user decides.

1. **Keyword**: a field schema declares `x-reference`, a mapping with three keys. The key `schema` names the logical contract of the records holding the entries, as their field `_schema` declares it. The key `collection` holds the field path of the collection from the root of each record. The optional key `key` holds the field path of the identifier from each entry. Without `key`, the entries of a mapping are named by their keys, and the items of a sequence by their text:

   ```yaml
   x-reference: { schema: 'example:catalog@1', collection: streams }
   x-reference: { schema: 'example:team@1', collection: members, key: id }
   ```

2. **Records**: only the records bound through their field `_schema` hold entries, and every record bound to the named contract contributes its entries.
3. **Check**: a built-in check reports a value naming no entry, through the index of records that the identifier links already maintain.
4. **Control**: the kind `reference`, derived from a well-formed `x-reference` on a string schema, displays a text input suggesting the identifiers through the element `datalist`.
5. **Icon**: the kind `reference` takes the Lucide icon `crosshair`.

## Constraints

- **Two shapes**: the entries are the keys of a mapping in one consumer, and the items of a sequence carrying an identifier field in the other common shape.
- **Shared definitions**: the keyword is typically written on one definition reached by `$ref` from many fields, so it must be read like the other annotations of ekphrasis, through composition.
- **Consumer independence**: ekphrasis reads no keyword defined by a consumer project, as the [decision on record identifiers](record-identifiers.md) requires.
- **Stable identity**: the identity of a record type must not depend on the local path of its schema, as the [decision on schema binding](schema-binding.md) requires.
- **Saving never blocked**: a value naming an entry not declared yet must still be saved as typed, as the specification of [saving](../features/saving.md) states.
- **No false report**: a value is reported as naming no entry only after the index has read the vault.
- **Replaceable index**: the roadmap plans to replace the index of identifiers by the read package of Anagraphe, so the forms must reach the entries through a port.

## Options weighed

### Shape of the keyword

| Option | Benefit | Cost |
| --- | --- | --- |
| Mapping `{schema, collection, key}` | Reuses the [field paths](../features/field-paths.md) of `x-identifier`, and the argument `key` of the checkers `unique-by` and `sorted-by`; one keyword covers both shapes | Three keys to write |
| One wildcard path, such as `streams.*` or `members[*].id` | Shortest form; reuses the wildcards of rules | In the field-path grammar, `*` designates the values of the entries, not their keys, so the keys shape bends the grammar; the path also fixes whether the collection is a mapping or a sequence |
| Three keywords, such as `x-reference-schema` | Each keyword holds a scalar | One declaration spread over three keywords, which composition can override separately |

The name `x-reference` names the relation and matches the kind. The name `x-target` was set aside, since a logical target of Anagraphe already designates a record by `{repository, id, unit}`.

### Designation of the records

| Option | Benefit | Cost |
| --- | --- | --- |
| Logical contract, such as `example:catalog@1` | Independent of every local path; the index already reads the contract of each record bound by `_schema` | Records bound by a modeline or a path rule hold no entries |
| Path of the schema, relative to the declaring schema | Covers the three binding routes | A move of either schema breaks the reference; two vaults may store the schema at different paths |
| Root `$id` of the bound schema | Standard identity of a schema | A contract schema generated per version changes its `$id`, and relative `$id` values are common, so equal `$id` values need not denote one record type |

The logical contract wins under the constraint of stable identity. The path of the schema would win if references had to reach records bound by a modeline or a path rule.

### Check of the value

| Option | Benefit | Cost |
| --- | --- | --- |
| Built-in check through the index of records | The index that suggests the entries also checks them; the issue displays at the field like any other | Reopens, for this one rule, the [decision of 2026-10-19](../architecture/implementation-plan.md#^rules-across-files) that rules across files run as custom checkers; programs outside Obsidian do not check the keyword |
| Custom checker of the consumer project | Keeps that decision intact; the project reuses its own rule | Each consumer writes and registers a checker; the check needs Python on desktop and is absent on mobile |
| No check, suggestions only | Smallest change | A misspelt identifier stays unnoticed in the form |

The decision of 2026-10-19 rested on the cost of four parts: a port reading every instance bound to a schema, an index kept current, the invalidation of the issues of every instance that names a changed file, and a validation after the commit. The milestone *Links* has since built the first two parts. The third part reduces to a refresh of the open forms when the entries of a reference already asked for change. The fourth holds, since the check reads the index synchronously at each validation. Therefore, the built-in check costs one rule, whereas the other families of the 2026-10-19 decision, uniqueness across files and acyclicity, stay with custom checkers. If the user keeps that decision whole, the check is removed alone: the method `referenceEntries` of the checker environment returns `null`, and the suggestions remain.

### Control

| Option | Benefit | Cost |
| --- | --- | --- |
| Text input with a `datalist` | Native suggestions filtered by the typed text; any text stays admitted, so an entry not declared yet is saved and reported | The list of the platform follows the theme of the platform, not that of Obsidian |
| Dropdown `select`, as the kind `choice` | Same control as the admitted values | Refuses an identifier not declared yet, and cannot show a value naming no entry, which then disappears from view |
| Suggestion class `AbstractInputSuggest` of Obsidian | Suggestions in the style of Obsidian | Every control would need the application of Obsidian, which the component tests replace by plain props |

### Icon

The icon `link` is left to the planned kind of internal link, and `at-sign` to the planned kind of email address, both listed in the roadmap. The icon `crosshair` evokes a target named elsewhere and collides with no planned kind. All three icons are present in the Lucide set of Obsidian 1.15.1.

## Consequences

- The [specification of field kinds](../features/field-kinds.md#^reference-kind) states the keyword and the behaviour, and the [keywords of ekphrasis](../features/schemas.md) gain `x-reference`.
- The index service keeps the value of every record bound by `_schema`, so its memory grows with the records of the vault.
- A malformed keyword is reported once per field schema as a defect of the schema, and the kind of its field is derived from the other keywords, as for a keyword `x-kind` naming no kind.
- A value is checked under any scalar kind declaring the keyword, whereas only the kind `reference` suggests the entries.
- Until the first build of the index completes, and during each rebuild, a reference receives no entries: the form neither suggests nor reports. The build then refreshes the open forms.
- A change of the entries of a reference already asked for refreshes every open form, after the delay of the settings refresh.
- The collection path admits no wildcard, so entries nested in several collections are out of reach until a later decision.
- The adoption of the read package of Anagraphe must serve the port `ReferenceLookup`, or keep the entry index of ekphrasis beside the package.
