---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Optional field removal
status: proposed
---
# Optional field removal

> [!QUESTION] Goal: how does the author remove from the file an optional field whose value is committed, key included?

Clearing the value of an optional field removes its key, as the rule of [cleared values](../features/saving.md#^cleared-values) states. A toggle has no empty state, so a boolean field cannot be cleared, and its key stays in the file once added. A collection holding entries has no single value to clear either.

## Decision

The record proposes four choices. Its status stays `proposed` until the user decides.

1. **Action**: every optional field present in the file carries the action *Remove*, beside its control or in the heading of its section. The action removes the key with its whole value, scalar or collection, through the existing removal of a mapping entry. A field required by the schema or by a current conditional rule, a locked field and a read-only form offer no removal.
2. **Last key**: when the removed key is the only key of its block mapping, the mapping keeps its own key with an empty value, as a switch of alternative leaves it.
3. **Draft**: the removal also ends the draft of a field that the author revealed through *+ Add a field*, so the field leaves the form.
4. **Confirmation**: the action asks no confirmation, as the removal of an item or of a keyed entry asks none.

## Constraints

- **Every optional field**: the removal must apply to any optional field, including a toggle and a collection, and never to a required field.
- **Preserved text**: the removal follows the rules of [structural edits](../features/saving.md#^structural-edits): each comment on the removed lines stays, and a block mapping keeps its block form.
- **Predictable form**: after the removal, the form displays the field as for a file opened without it.

## Options weighed

### Means of removal

| Option | Benefit | Cost |
| --- | --- | --- |
| Action *Remove* on each present optional field | Covers every kind with one action; reuses the removal of an entry and its preservation of comments | One more button per optional field present |
| Empty state of the toggle, as a third state | No new button | Covers booleans only; a third state turns the checkbox into a control whose next state the author must learn |
| Source view only | No change | Leaves the author of a form without a way to undo the addition of a toggle |

### Mapping left without keys

| Option | Benefit | Cost |
| --- | --- | --- |
| Empty value after the key of the mapping | The next field is written in block form, as the mapping was; a switch of alternative already writes this form | The mapping reads as the null value, so a required mapping is then reported missing, which states its content exactly |
| `{}`, as the removal of the only entry of a keyed collection | The mapping stays a mapping | A flow collection never becomes a block collection, so every later field of the mapping would be written inline |
| Refusal | No change of form | The last optional key could never be removed from the form |

### Confirmation

A switch of alternative confirms a loss of values because it removes keys that the author did not name. The action *Remove* names its field, as the removal of an item names its item, so the two removals take the same rule. The key `Cmd+Z` cannot undo a removal, since the history of a control covers its own text only. An accidental removal, like an accidental removal of an item, is therefore restored through the file recovery of Obsidian or through version control.

## Reproduction of the report on a cleared Markdown field

A cleared optional field of kind `markdown` was reported to stay in the form. A component test reproduced three cases on 2026-11-15:

- a value present when the file opens, written plain or as a block scalar: clearing it removes its key, keeps the comment line that follows the block scalar, and the field leaves the form once the author leaves the control;
- a field revealed through *+ Add a field*, filled, then cleared: its key leaves the file, while the field stays as an empty draft with its action *Discard*.

The saving rule held in every case, so no defect of saving showed. The revealed field follows the rule of drafts in the [form view](../features/form-view.md): a revealed field stays a draft until it is discarded. That draft is the likeliest origin of the report. Clearing does not end the draft, since a commit made while the author types would otherwise remove the control under the cursor. The action *Remove* ends it, since the author then names the removal explicitly.

## Consequences

- The specifications of the [form view](../features/form-view.md) and of [saving](../features/saving.md) state the action.
- A removal that the plan of commits refuses, such as the only key of a mapping item spanning lines of its own, displays its reason at the field and leaves the file unchanged.
- The only key of the root mapping is refused as well, since the root has no key to keep with an empty value. A record bound by `_schema` always holds that key, so the refusal concerns records bound by a modeline or a path rule. Its reason is the generic one, that the place of the value could not be determined; a reason of its own would join the refusals that the golden test of saving enumerates.
