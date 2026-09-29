---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - View specifications
---
# View specifications

A view specification declares how the keys of a family of YAML notes display, without modifying the data of these notes. The declaration stands in a note kept apart from the data, so that one declaration serves every note of the family. Thus, view specifications satisfy the [requirement on customizable presentation](../requirements.md#^customizable-presentation).

## Selection

Each YAML note displays under at most one view specification, taken from the first of two sources that assigns a view specification to the note:

1. the frontmatter key `view` of the YAML note, whose value links a view specification;
2. the folder rules of the plugin settings, each assigning a view specification to the YAML notes of a folder and of its subfolders.

When several folder rules apply to one note, the rule of the deepest folder applies. When neither source assigns a view specification, every key of the note takes the [default presentation](default-presentation.md). Every open YAML note renders again when its view specification changes.

## Format

A view specification is itself a YAML note, so that it can be linked, indexed and rendered. Its body holds a single key `rules`, whose value is a sequence of rules. Each rule pairs a path pattern with presentation keys. The view specification below renders the summary as Markdown and the objective as a display formula under its own label. Its third rule hides the identifiers read by programs only:

```yaml
rules:
  - path: "model.summary"
    render: markdown
  - path: "model.objective"
    render: math
    label: "Training objective"
  - path: "**.id"
    hidden: true
```

Within a view specification, the first rule whose pattern matches the path of a key applies to that key. Therefore, the rules must be ordered so that each narrow pattern precedes the broader patterns. A key matched by no rule takes the default presentation.

## Path patterns

The pattern of a rule is a [key path](key-paths.md). To match several keys with one rule, this pattern may hold the wildcard segments `*` and `**`. For example, the pattern `**.id` matches every key `id`, at any depth of the body.

## Presentation keys

A rule carries at least one of the following presentation keys:

| Key | Values | Effect |
| --- | --- | --- |
| `render` | `inline`, `markdown`, `math`, `code`, `sections`, `list`, `table` | Strategy by which the value displays |
| `label` | text | Label displayed in place of the key |
| `heading` | `true`, `false` | Whether a mapping opens a section under a heading, or displays its key as a bold label |
| `collapsed` | `true`, `false` | Whether the section of a mapping is folded when the note opens |
| `hidden` | `true`, `false` | Whether the key is omitted from the display |
| `language` | language name | Highlighting language of a value displayed as code |
| `columns`, `row-key-label`, `value-label` | As defined for the [table keys](correspondence-tables.md#^table-keys) | Columns and headers of a correspondence table |

When a strategy does not apply to the value, as when a rule requests a table for a scalar, the value takes the default presentation. In that case, the reading mode reports the rule concerned.
