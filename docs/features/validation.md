---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Validation
---
# Validation

Ekphrasis checks an instance against the rules of its schema after each commit, and reports every missing or invalid field. The rules are declared in the schema at four scopes, as the [requirement on declared rules](../requirements.md#^declared-rules) demands:

| Scope | Declared at | Object checked |
| --- | --- | --- |
| Field | The schema of the field | The value of that field |
| Instance | The root of the schema | The whole instance |
| Relational | The schema of a group | Several fields of the group, compared with one another |
| Conditional | The schema of a group | A field of the group, checked only when a condition on other fields holds |

## Order of checks

Each field passes through three stages, in a fixed order:

1. The unfilled fields are set apart first. A required field holding an [unfilled value](schemas.md#^unfilled-values) is reported as missing, whereas an optional unfilled field raises no issue. No further rule runs on an unfilled field.
2. The standard keywords of JSON Schema check the filled fields: types, admitted values, patterns, lengths, ranges, and the conditions expressed by `if`, `then`, `else` and `dependentRequired`.
3. The rules of the keyword `x-rules` run last: first the predefined checkers, then the [custom checkers](custom-checkers.md).

^unfilled-first

Therefore, each missing field of an incomplete instance is reported once, without a type error on the same field.

## Rule declarations

The keyword `x-rules` holds a sequence of rule declarations. Each declaration names its checker under the key `check`, and passes the arguments of that checker as further keys. Two keys are common to every declaration:

- the key `severity` takes the value `error` or `warning`, and defaults to `error`;
- the key `message` replaces the message produced by the checker.

A relational or conditional rule names its fields by [field paths](field-paths.md), relative to the group that declares the rule. The schema below limits a statement to forty words, requires a tolerance for two of the aims, and orders two dates:

```yaml
type: object
x-rules:
  - check: required-when
    field: tolerance
    when: {field: aim, in: [prediction, control]}
  - check: compare
    left: start
    operator: "<="
    right: end
properties:
  statement:
    type: string
    x-kind: markdown-line
    x-rules:
      - check: word-count
        max: 40
  aim:
    enum: [prediction, control, explanation]
  tolerance:
    type: number
  start:
    type: string
    format: date
  end:
    type: string
    format: date
```

## Predefined checkers

The predefined checkers cover rules beyond the standard keywords of JSON Schema:

| Checker | Scope | Arguments | Condition checked |
| --- | --- | --- | --- |
| `word-count` | Field | `min`, `max` | The text holds a number of words within the bounds |
| `sentence-count` | Field | `min`, `max` | The text holds a number of sentences within the bounds |
| `inline-markdown` | Field | none | The text holds no Markdown block construct, such as a list or a callout |
| `latex` | Field | none | The formula renders without error |
| `unique-by` | Field | `key` | The items of a sequence hold distinct values under the key |
| `sorted-by` | Field | `key`, `order` | The items of a sequence follow the order of their values under the key |
| `compare` | Relational | `left`, `operator`, `right` | The two fields satisfy the comparison, among `<`, `<=`, `=`, `!=`, `>=` and `>` |
| `required-when` | Conditional | `field`, `when` | The field is filled whenever the condition holds |
| `forbidden-when` | Conditional | `field`, `when` | The field is unfilled whenever the condition holds |

A condition `when` names a field under the key `field`, and applies one test to its value, among `equals`, `in`, `filled` and `unfilled`. A relational or conditional checker declared at the root of the schema acts on the whole instance, so its field paths start from the root.

## Issues

Each issue carries four elements:

- the [field path](field-paths.md) of the field concerned;
- the name of the checker that raised it;
- its severity, `error` or `warning`;
- its message.

The form view and the outline display each issue at its field, as the [requirement on visible issues](../requirements.md#^visible-issues) demands. An issue whose path designates no field of the form displays at the top of the form. The command *Validate instance* runs every rule immediately, custom checkers included, without waiting for the commits to pause.
