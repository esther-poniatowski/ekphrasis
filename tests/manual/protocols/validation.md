# Test protocol: Validation

This checklist verifies the milestone *Validation* inside Obsidian, before the milestone is declared complete. Each item states an action, then the expected result after the arrow. Tick an item when the result matches, and write any deviation under *Observations*, with the message of the developer console (`Cmd+Option+I`, tab *Console*) when one appears.

> [!TIP] Rule for a failing item
> Record the deviation and continue with the next item. Stop only when the plugin fails to load, since every later item depends on it.

## Setup

The record `scenarios/validation.yml` holds one issue of each kind, against the schema `scenarios/validation.schema.yaml`. The items change the record cumulatively, and the section *Reset* restores it.

- [ ] Run `npm run build` and `npm run test-vault` from the root of the repository, then restart Obsidian, or disable and enable *Ekphrasis* in *Settings → Community plugins*. → No error notice appears, and the console holds no line starting with `ekphrasis:`.
- [ ] Open `scenarios/validation.yml`. Open it a second time in a pane on the right, through *Split right* in the tab menu, and switch the right pane to the source view. → The left pane shows the form, and the right pane the YAML text.

## Issues at opening

Each item below concerns the form of the left pane. A missing field takes the accent colour of the required marker, and an invalid value the colour of errors, both on the left edge of the field and in its message.

- [ ] Look at the top of the form. → A box *Schema warnings* lists `(root)` with *The rule `spell-check` names no checker known to ekphrasis.* Below it, a red box reads *Validation: 3 missing fields, 9 invalid values and 1 warning.*, with no issue listed under it.
- [ ] Field *status*. → *This required field is missing.*, in the accent colour.
- [ ] Field *title*. → *The text must hold one line, without line breaks.*, in red.
- [ ] Field *summary*. → *The text holds 8 words, whereas at most 5 are admitted.*, in orange.
- [ ] Field *id*. → *The label must hold one word, without spaces.*, in red.
- [ ] Field *count*. → *The value must be at least 1.*
- [ ] Field *category*. → One message only: *The value must be one of: `noun`, `verb`.*
- [ ] Field *code*. → *The text must match the pattern `^[a-z]+$`.*
- [ ] Field *formula*. → A message starting with *The formula fails to render:*, followed by the error of MathJax, such as a missing close brace.
- [ ] Field *tolerance* (absent). → *This field is required when `aim` equals `prediction`.*, in the accent colour.
- [ ] Field *start*. → *The value `2026-10-13` must be at most `2026-10-01`, the value of `end`.*
- [ ] Heading of the group *detail*. → A badge *1 issue* on the right of the heading. Field *detail → note* (absent). → *This required field is missing.*
- [ ] Heading of the sequence *symbols*. → A badge *1 issue*. Field *symbols → #3*. → *The value `alpha` repeats the value of item #1.*
- [ ] Area *Keys outside the schema*, at the end of the form. → The key *extra* carries *This key is outside the schema.*

## Issues after commits

Each commit validates the record again, so each item changes the issues at once, without a reload.

- [ ] Field *count*: type `5`, then `Tab`. → The message of *count* disappears, and the summary reads *8 invalid values*.
- [ ] Field *status*: choose *answered*. → The message of *status* disappears, and the summary reads *2 missing fields*.
- [ ] Field *status*: choose the empty option. → The right pane shows `status: open`, and *status* shows *This required field is missing.* again.
- [ ] Field *title*: replace the text by `One title`, then `Tab`. → The message of *title* disappears.
- [ ] Field *formula*: replace the text by `\frac{a}{b}`, then `Tab`. → The message of *formula* disappears.
- [ ] Field *symbols → #3*: replace `alpha` by `gamma`, then `Tab`. → The message disappears, and the badge of *symbols* with it.
- [ ] Field *detail → note*: type `a note`, then `Tab`. → The message disappears, and the badge of *detail* with it.

## Conditions

- [ ] Field *aim*: choose *explanation*. → The message of *tolerance* disappears. The red box at the top lists `explanans` with *This required field is missing.*, since the schema requires that field outside its properties.
- [ ] Field *aim*: choose *description*. Field *tolerance*: type `0.1`, then `Tab`. → *tolerance* shows *This field must stay unfilled when `aim` equals `description`.*, in orange, and the top no longer lists `explanans`.
- [ ] Field *tolerance*: delete its text, then `Tab`. → The message of *tolerance* disappears.

## Command *Validate instance*

- [ ] Scroll the form to its end. Open the command palette (`Cmd+P`) and run *Ekphrasis: Validate instance*. → A notice reads *Ekphrasis: 1 missing field, 5 invalid values and 1 warning.*, the count of the summary box. The form scrolls to the first issue displayed.
- [ ] Switch the left pane to the source view, then run *Validate instance*. → The left pane returns to the form, and the same notice appears.
- [ ] Open `scenarios/unbound.yml`, and run *Validate instance*. → A notice reads *Ekphrasis: the instance has no form, so it was not validated.*

## Conditional rule of gnomon

This section verifies the exit criterion inside Obsidian. The question fixture binds to its schema by a path rule of the test vault, and its schema requires fields according to the epistemic aim.

- [ ] Open `gnomon/question.yml`. → The summary reads *Validation: 1 missing field.* The heading of *task* carries *1 issue*, and the field *task → requested relation* shows *This field is required when `task.epistemic_aim` equals `explanation`.*
- [ ] Field *task → epistemic aim*: choose *Modal knowledge*. → The message of *requested relation* disappears, and the sequence *task → proof obligations* shows *This field is required when `task.epistemic_aim` equals `modal-knowledge`.*
- [ ] Field *task → epistemic aim*: choose *Prediction*. → The summary box disappears, since the record lists one output to match.
- [ ] Field *task → epistemic aim*: choose the empty option. → The right pane, or the source view, shows `epistemic_aim: open`, and the field shows *This required field is missing.*

## Reset

To restore the records, run `npm run test-vault` from the root of the repository: it copies the scenario records and the fixtures afresh into the test vault.

## Observations
