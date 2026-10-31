---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Schema composition
status: proposed
---
# Schema composition

> [!QUESTION] Goal: how does the form read a schema whose fields and root keywords are spread over subschemas composed by `$ref` and `allOf`?

A project can narrow the schema of a tool without copying it. The tool publishes a base schema that leaves a vocabulary field open, such as `role: {type: string}`. The project writes a root schema of its own, which composes the base by `allOf`, narrows the field by an `enum`, fixes its own `_schema`, and repeats `x-identifier`. Until this decision, the form displayed only the properties written in the root and in the chosen alternative of a `oneOf`, and read the root keywords only along a chain of `$ref`. The fields of the base were then absent from the form.

## Decision

The schema view reads a composition: a subschema, the target of its `$ref`, the subschemas of its `allOf`, and recursively the subschemas that these compose. Each keyword belongs to one of three classes, as the specification of [schemas](../features/schemas.md#^composition) details:

1. **Annotations** take their nearest declaration. The annotations comprise `title`, `description`, `examples`, `const`, `oneOf`, and the keywords of ekphrasis except `x-rules`, among them the root keywords `x-identifier`, `x-unfilled` and `x-kind`. The order of lookup is breadth-first: the subschema itself, then the subschemas that it composes directly, then the subschemas that these compose. Among the subschemas composed by one schema, the target of its `$ref` precedes the subschemas of its `allOf`, in their written order.
2. **Constraints** hold in every subschema, so their declarations merge. The keys of `properties`, `required` and `dependentRequired` are united, and the names of `type` and the values of `enum` are intersected. The subschemas of `items` and of the keys absent from `properties` are conjoined. Finally, `uniqueItems` holds when one subschema requires it, and the rules of `x-rules` accumulate.
3. **Properties** give one field per key. The subschema of a key declared by several subschemas is the conjunction of its declarations, nearest first. The fields of a base precede those of the schema composing it, and each key keeps the position of its first declaration in that order.

The admitted values of a field of kind `choice` are the values enumerated by every subschema that enumerates values, by `enum`, by a `oneOf` of `const` values or by a `const`. These values follow the order of the nearest enumeration, and each value keeps the first title and the first description declared for it. A scalar kind declared by `x-kind` in a subschema farther than the nearest enumeration yields to the kind `choice`.

Validation stays with Ajv, which receives the schemas unchanged.

### Conflicting constraints

Three conflicts leave no control able to express every constraint:

- the keywords `type` of the subschemas admit no common type, `integer` counting as a `number`;
- the enumerations of the subschemas admit no common value;
- several subschemas declare alternatives by a `oneOf` of object schemas.

For each conflict, the control follows the nearest declaration of the conflicting keyword, and the form reports the conflict as a defect of the schema at that field. Ajv still checks every subschema, so a value accepted by the control can raise an issue.

## Constraints

- **Single validator**: the standard keywords are checked by Ajv only, so the form must not reimplement the validation of a composition.
- **One field per property**: an author fills each key of the instance once, even when several subschemas constrain it.
- **Stable order**: narrowing a field of a base must not move that field in the form.
- **Honest controls**: a control must offer only the answers that every subschema admits, or report why it cannot.
- **Readers of the root**: the binding, the index of identifiers and the checks of the schema read `_schema`, `x-identifier` and `x-unfilled` at the root, and must find them in a base composed by `allOf`.

## Options weighed

### Place of the merge

| Option | Benefit | Cost |
| --- | --- | --- |
| Schema view reading the composition | Every reader of a schema, the form, the kinds, the identifier and the checks of the schema, sees the same composition | The view distinguishes annotations from constraints, keyword by keyword |
| Form builder alone | The schema view stays unchanged | The identifier, the derivation of kinds and the checks of the schema would each need a merge of their own |
| Merged schema document built at loading | Readers see one plain object | A merged object loses the document of each subschema, which resolves its relative references, and must settle each conflict when it is written |

### Order of lookup of the annotations

| Option | Benefit | Cost |
| --- | --- | --- |
| Breadth-first, by the number of compositions crossed | The nearest declaration wins in every order of the subschemas | Two subschemas at the same distance need a tie rule: the `$ref` target, then `allOf` in written order |
| Depth-first, the subschema then each composed subtree | Simple to state | A base reached through the first entry of `allOf` overrides an annotation written directly in the second entry |
| Farthest first | A base fixes the annotations | A consumer cannot override a description or a title of the base |

### Order of the fields

| Option | Benefit | Cost |
| --- | --- | --- |
| Bases first, at the first declaration of each key | The base fixes the order, and a narrowed field keeps its place | A field added by the composing schema follows the fields of the base |
| Nearest first | The composing schema fixes the order | Narrowing a field moves it to the top of the form |

### Conflicting constraints

| Option | Benefit | Cost |
| --- | --- | --- |
| Nearest declaration, with a defect of the schema | The field stays editable, and the defect states which subschemas disagree | The control can offer a value that Ajv rejects |
| Empty control | No control offers a rejected value | An existing value cannot be read or changed in the form |
| Control derived from the shape of the value | The value stays visible | The control ignores every declaration, including the declarations that agree |
| Refusal to open the form | No misleading control | One conflicting field hides every other field |

## Consequences

- A keyword written beside a `$ref` keeps overriding the annotations of the referenced schema, whereas its constraints now merge with those of the referenced schema. For instance, a `properties`, a `required` or an `x-rules` written beside a `$ref` adds to the referenced keyword instead of replacing it, as JSON Schema applies both.
- The checks of the schema find a required property declared in a subschema of `allOf`, and name a requirement declared inside a composed subschema as such.
- The field path of `x-identifier` may designate a property declared in a composed base.
- The `const` of the root property `_schema` takes its nearest declaration, so a root schema composing a base fixes its own contract.
- Conditional subschemas (`if`, `then`, `else`), `anyOf` and the alternatives of a farther `oneOf` add no field; the milestone *Conditional fields* decides their display.

## Verification

The [composition tests](../../tests/domain/form/composition.test.ts) plant each rule. The cases cover the properties and required keys of `allOf`, an open `string` or described options narrowed by an `enum`, and a text kind yielding to `choice`. The cases also cover the rules gathered from several subschemas, the root keywords read through `allOf` in breadth-first order, and each conflict. The [form service tests](../../tests/application/form-service.test.ts) validate a composed record with Ajv.
