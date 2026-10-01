---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Field paths
---
# Field paths

A field path designates one node of an instance, starting from the root of the document, except in a relational or conditional rule, where it starts from the group that declares the rule. Four features share the same syntax:

- the [issues](validation.md), to locate the field that fails a check;
- the relational and conditional [rules](validation.md), to name the fields that they relate;
- the [custom checkers](custom-checkers.md), to locate the issues that they return;
- the [outline](outline.md), to move the form to a field.

## Segments

A field path joins segments that descend from the root. A key of a mapping follows a dot, except at the start of the path, and a position in a sequence stands between brackets, counted from zero:

| Segment | Designated node |
| --- | --- |
| `statement` | Value of the key `statement` |
| `[2]` | Item at position 2 of a sequence |
| `["a.b"]` | Value of the key `a.b`, whose name contains a dot |
| `[*]` | Every item of a sequence, in a rule only |
| `*` | Every key of a mapping, in a rule only |

In the instance below, the path `subject.foils[1].symbol` designates the symbol of the second foil:

```yaml
subject:
  foils:
    - name: laminar flow
      symbol: L
    - name: Gaussian statistics
      symbol: G
```

## Wildcards

A rule may hold the wildcards `[*]` and `*`, so that one declaration applies to every item of a collection. An issue designates one node, so its path never holds a wildcard. For example, the rule path `subject.foils[*].symbol` yields the issue paths `subject.foils[0].symbol` and `subject.foils[1].symbol`.
