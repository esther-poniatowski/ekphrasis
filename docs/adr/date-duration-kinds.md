---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Date and duration kinds
status: proposed
---
# Date and duration kinds

> [!QUESTION] Goal: how does the form recognize, display and check a calendar date and a duration, while the variants of dates remain undecided?

A string holding a calendar date or an ISO 8601 duration, such as `2026-11-15` or `PT2H`, displays today as a plain text: the author receives no hint of the expected form, and no calendar. The milestone *Dates* of the [roadmap](../../TODO.md) leaves open the variants of a date: partial dates, ranges, dates relative to an event, each with an optional time. This record fixes only the two variants that standard JSON Schema already names.

## Decision

The record proposes four choices. Its status stays `proposed` until the user decides.

1. **Derivation**: a string schema declaring `format: date` takes the kind `date`, and one declaring `format: duration` takes the kind `duration`. Every other value of `format`, such as `date-time`, keeps the kind `text`.
2. **Check**: the keyword `format` checks both kinds, as the validator of ekphrasis already does, and the message of a failure states the expected form.
3. **Controls**: a date displays a text input followed by a button that opens the native calendar of the platform; a duration displays a text input. An empty control shows the expected form after the mark `—`: `YYYY-MM-DD` for a date, and `ISO 8601, such as PT1H30M` for a duration, unless the field has an example.
4. **Icons**: the kind `date` takes the Lucide icon `calendar`, and the kind `duration` the icon `timer`.

## Constraints

- **Open variants**: the choices of the milestone *Dates* must stay open, so a later variant must not require a change of the kind `date`.
- **Reuse by programs**: a rule expressed by a standard keyword is checked by the programs of a project as well, as the decision on the [schema dialect](json-schema-dialect.md) records.
- **Visible values**: a value that the control cannot hold, such as a partial date, must stay visible and editable, since validation never blocks [saving](../features/saving.md) and an invalid value is saved as typed. An unfilled value displays the mark `—`.
- **No dependency**: the controls use the elements of the platform, without a new package.

## Options weighed

### Derivation of the kind

| Option | Benefit | Cost |
| --- | --- | --- |
| From `format` | A schema already checked by programs gains the control without a new keyword | The kind exists only for the values of `format` that name a variant |
| From `x-kind: date` only | Independent of the standard keywords | The schema must declare the format twice to be checked by programs |
| From a `pattern` resembling a date | No declaration | A pattern does not state its meaning, so the derivation would guess |

A declared `x-kind: date` still selects the control, as every declared kind does, but its value is then checked only when the schema also declares `format: date`.

### Check

| Option | Benefit | Cost |
| --- | --- | --- |
| Keyword `format`, through the validator in its full mode | One check, shared with the programs of the project; a date must also lie in its calendar range | The duration grammar is that of the validator: a week stands alone, as `P2W`, and seconds are whole |
| Rule implied by the kind, as for `label` | Checks a declared kind without `format` | Duplicates the error of `format` on the same field, and runs in ekphrasis only |

### Control of a date

| Option | Benefit | Cost |
| --- | --- | --- |
| Text input, with a button opening a hidden native date input | Any text stays visible, such as a partial date or an invalid one; the calendar follows the platform | Two elements per field; the calendar relies on `showPicker`, available in the Chromium of Obsidian on desktop |
| Native date input alone | One element, with a calendar | Displays a partial or invalid value as empty, shows the date in the format of the locale, and cannot show the mark `—` |
| Text input alone | Simplest | No calendar |

A duration has no native control, and its units combine in one value, so a number with a unit selector would cover part of the grammar only. The text input with its placeholder wins.

### Icons

The kind `date` takes the icon of the property type *Date* of Obsidian, following the rule of the [kind icons](../features/form-view.md#^kind-icons). The icon `clock` is left out, since Obsidian gives it to the property type *Date & time*, which a later variant may take. Both icons are present in the Lucide set of Obsidian 1.15.1.

## Relation to the milestone *Dates*

The two kinds cover one variant of the first step of that milestone, the calendar date without time, as a string in ISO 8601. The duration is no variant of that step. The three steps stay open for the other variants:

- a partial date, a range, a date relative to an event, or a date with a time keeps the kind `text` until its form is decided; such a decision can add a kind or a value of `format` without changing `date`;
- the control of the calendar date already shows its expected form and offers a calendar, as the second step asks for each variant;
- the check of the calendar date already includes its calendar range, while the order of the two dates of a range remains with the third step.

## Consequences

- A new date is written single-quoted, as `'2026-11-15'`, since a plain date reads as a timestamp in YAML 1.1, as the [scalar styles](../features/saving.md) state. A string schema thereby stays satisfied when a program reads the file with a YAML 1.1 parser.
- The [specification of field kinds](../features/field-kinds.md) and the [kind icons](../features/form-view.md#^kind-icons) list both kinds.
- The calendar on mobile depends on the support of `showPicker` by the platform; a platform without it receives a click on the hidden input, and the protocol records the result.
