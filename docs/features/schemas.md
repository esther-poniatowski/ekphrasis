---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Schemas
---
# Schemas

A schema declares a record type: the fields of its instances, the kind of each field, its default value, its instructions and its validity rules. From this single declaration, ekphrasis generates the form, the skeleton of a new instance and the checks. A schema is written in JSON Schema, draft 2020-12, extended by keywords of ekphrasis, as the decision on the [schema dialect](../adr/json-schema-dialect.md) records.

## Files

A schema is a file written in JSON or in YAML, conventionally with the extension `.schema.json` or `.schema.yaml`. Its root declares the draft by the keyword `$schema`, and the identifier of the schema by the keyword `$id`. A schema can reuse the definitions of another schema through the keyword `$ref`, whose relative path is resolved from the folder of the referencing schema.

## Fields

The form follows the schema structure. Each property of an object schema becomes a field, in the order declared by `properties`. Ekphrasis uses the reserved root property `_schema` to resolve the record contract, and omits that property from the content form. The following standard keywords control how each content field appears and accepts input:

| Keyword | Effect in the form |
| --- | --- |
| `title` | Label of the field, displayed in place of its key |
| `description` | Instructions of the field, displayed on demand and rendered as Markdown |
| `examples` | Example values, displayed on demand below the instructions |
| `default` | Value written into a new instance |
| `required` | Fields of the object that must be filled |
| `type`, `enum`, `oneOf`, `items`, `properties` | [Kind of the field](field-kinds.md), when the keyword `x-kind` is absent |

^field-keywords

## Required, optional and conditional fields

A field listed under the keyword `required` of its parent must be filled, and a field absent from that keyword is optional. The content written for each field into a new instance, with or without a default value, is specified under [instance creation](instance-creation.md).

A conditional field is required only under a condition on other fields. Two standard keywords express such conditions:

- the keyword `dependentRequired` requires a field whenever another field is present;
- the keywords `if`, `then` and `else` apply a subschema according to the values of other fields.

The schema below requires the field `tolerance` when the field `aim` holds the value `prediction`:

```yaml
type: object
required: [aim]
properties:
  aim:
    enum: [prediction, explanation]
  tolerance:
    type: number
if:
  required: [aim]
  properties:
    aim: {const: prediction}
then:
  required: [tolerance]
```

The keyword `required` inside the condition is needed, since a condition on an absent property holds vacuously in JSON Schema. Validation reports a field required by a condition at that field, as for any required field. When the required field lies in a group absent from the instance, the keyword `required` designates the group instead. The rule `required-when` of [validation](validation.md) designates the field itself, even inside an absent group, at the cost of a rule checked by ekphrasis only.

## Unfilled values

A field holding the null value counts as unfilled. A schema may declare further unfilled values by the keyword `x-unfilled` at its root, such as the value `open` by which some projects mark a field left open deliberately, or the empty sequence `[]`. A declared value may be any JSON value, and a field counts as unfilled when its value equals one of them. Validation reports an unfilled required field as missing, following the [order of checks](validation.md#^unfilled-first). ^unfilled-values

The form displays every unfilled value as an empty control, as the [form view](form-view.md#^unfilled-display) specifies. Therefore, no field may enumerate a value of `x-unfilled` among its answers, since the author could never choose that value. The form reports such a field as a defect of the schema.

## Keywords of ekphrasis

Ekphrasis adds eight keywords, each prefixed by `x-`:

| Keyword | Position | Value | Effect |
| --- | --- | --- | --- |
| `x-kind` | Any field | Name of a [field kind](field-kinds.md) | Control through which the field is filled |
| `x-list-layout` | Field of kind `list` | `compact` or `expanded` | [Initial layout](field-kinds.md#^list-layouts) of the list, `compact` by default |
| `x-rules` | Any field, or the root | Sequence of rule declarations | [Rules](validation.md) checked in addition to the standard keywords |
| `x-collapsed` | Group or collection | `true` or `false` | Whether the field is folded when the form opens |
| `x-align` | Field of kind `latex`, or column of a table | `left` or `center` | Alignment of the formula in its control or its cell, `center` by default |
| `x-unfilled` | Root | Sequence of JSON values | Values counted as unfilled, in addition to the null value |
| `x-version` | Root | Version identifier | [Version](schema-editor.md#^schema-version) of the schema |
| `x-identifier` | Root | [Field path](field-paths.md), such as `identity.id` | Field holding the identifier of each record, named by the [links by identifier](links.md) |

Every record of a type must hold its identifier at the same path. Therefore, the keyword `x-identifier` must designate a declared property, reached from the root through the keyword `properties` of each group or of its alternatives. When the value of the keyword is no field path, holds a wildcard, or designates no declared property, the form reports a defect of the schema.

Ekphrasis ignores every other keyword prefixed by `x-`. Therefore, a project can keep extension keywords of its own in the same schema, for the checkers that read them.
