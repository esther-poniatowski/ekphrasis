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
2. The standard keywords of JSON Schema check the filled fields: types, admitted values, patterns, lengths, ranges, and the conditions expressed by `if`, `then`, `else` and `dependentRequired`. These keywords read an unfilled value as an absent key, so a condition on an unfilled field holds exactly when it holds for an absent key.
3. The rules run last: first the predefined checkers of the keyword `x-rules` and the rules implied by [field kinds](field-kinds.md), then the [custom checkers](custom-checkers.md).

^unfilled-first

Therefore, each missing field of an incomplete instance is reported once, without a type error on the same field. An empty instance is checked as an empty mapping, so each required field of its root is reported as missing.

## Standard keywords

The validator locates each error of a standard keyword at a node of the instance. Three conversions then place the issue at the field concerned:

- a missing required key, a key outside the schema and a key rejected by `propertyNames` are reported at the *key*;
- the failures of the alternatives of one `oneOf` or `anyOf` merge into one issue, and its message lists the admitted values when each alternative fixes a value by `const` or `enum`;
- the failure of an `if` is reported through the keywords of its `then` or its `else` only.

The keyword `format` is checked for the formats of JSON Schema, such as `date`, `date-time`, `email` and `uri`, and a date must also lie in its calendar range. A format unknown to the validator is ignored. When the validator refuses a schema, for instance for a pattern that is no valid regular expression, the refusal is reported as a [schema defect](form-view.md), and the rules still run.

## Rule declarations

The keyword `x-rules` holds a sequence of rule declarations. Each declaration names its checker under the key `check`, and passes the arguments of that checker as further keys. Two keys are common to every declaration:

- the key `severity` takes the value `error` or `warning`, and defaults to `error`;
- the key `message` replaces the message produced by the checker.

Three defects of a declaration are reported once as a [schema defect](form-view.md), and the rule of that declaration does not run:

- a malformed key `check`, `severity` or `message`, or a malformed argument;
- an argument unknown to the checker;
- a name under `check` that designates no checker.

A rule names fields by [field paths](field-paths.md) written from the field that declares it. Therefore, a rule declared in the schema of the items of a sequence runs on each item, from that item. The schema below limits a statement to forty words, requires a tolerance for two of the aims, and orders two dates:

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
| `word-count` | Field | `min`, `max`, at least one | The text holds a number of words within the bounds, a word being a run of characters without whitespace |
| `sentence-count` | Field | `min`, `max`, at least one | The text holds a number of sentences within the bounds, a sentence ending at `.`, `!`, `?` or `…` followed by whitespace, or at the end of the text |
| `inline-markdown` | Field | none | The text holds no Markdown block construct |
| `latex` | Field | none | The formula renders through the MathJax of Obsidian without a parse error; an undefined command renders in colour and raises no issue |
| `unique-by` | Field | `key`, optional | The items of a sequence hold distinct values under the key, or are distinct themselves without a key |
| `sorted-by` | Field | `key`, optional; `order`, `ascending` by default, or `descending` | The items of a sequence follow the order of their values under the key, or of the items themselves without a key |
| `compare` | Relational | `left`, `operator`, `right` | The two fields satisfy the comparison, among `<`, `<=`, `=`, `!=`, `>=` and `>` |
| `required-when` | Conditional | `field`, `when` | The field is filled whenever the condition holds |
| `forbidden-when` | Conditional | `field`, `when` | The field is unfilled whenever the condition holds |

The checker `inline-markdown` recognizes a block construct by the start of a line, or by a blank line between two lines of text:

- a heading, a list item, a quote or a callout;
- a code block, a horizontal rule or a table row;
- a block of display mathematics, opened by `$$`;
- a blank line between paragraphs.

The key `key` of a checker of sequences is a field path written from each item, such as `symbol`. The checker `compare` orders numbers by value and texts character by character, so dates written as `YYYY-MM-DD` compare in time order; its operators `=` and `!=` also compare other values. Every predefined checker skips an unfilled value. Each checker also skips a value whose type differs from the type read by the checker, since the keyword `type` reports that value.

A condition `when` names a field under the key `field`, and applies one test to its value: `equals: VALUE`, `in: [VALUES]`, `filled: true` or `unfilled: true`. A relational or conditional checker declared at the root of the schema acts on the whole instance, so its field paths start from the root.

### Paths with wildcards

A relational or conditional rule relates a subject path, at which the issue is reported (`left`, `field`), to a reference path (`right`, the field of `when`). The two paths expand together: a wildcard in the prefix shared by both paths binds the same item in both. The rule below requires the symbol of each foil that has a name:

```yaml
x-rules:
  - check: required-when
    field: foils[*].symbol
    when: {field: foils[*].name, filled: true}
```

After the shared prefix, a wildcard is admitted in the subject path only, and each node that it reaches is checked.

## Issues

Each issue carries four elements:

- the [field path](field-paths.md) of the field concerned;
- the name of the checker that raised it: a keyword of JSON Schema, a checker named under `check`, or a field kind whose implied rule failed;
- its severity, `error` or `warning`;
- its message.

An issue of severity `error` reports either a *missing* field, left unfilled although required, or an *invalid* value, found in a filled field. The form view and the outline display each issue at its field, as the [requirement on visible issues](../requirements.md#^visible-issues) demands, with the marks that the [form view](form-view.md) specifies. The command *Validate instance* runs every rule immediately, custom checkers included, without waiting for the commits to pause. The command then reports the number of missing fields, invalid values and warnings in a notice, and scrolls the form to the first issue displayed.
