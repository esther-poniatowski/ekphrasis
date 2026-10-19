# Test protocol: Validation

This checklist verifies the milestone *Validation* inside Obsidian, before the milestone is declared complete. Each item states an action, then the expected result after the arrow. Tick an item when the result matches, and write any deviation under *Observations*, with the message of the developer console (`Cmd+Option+I`, tab *Console*) when one appears.

> [!TIP] Rule for a failing item
> Record the deviation and continue with the next item. Stop only when the plugin fails to load, since every later item depends on it.

## Setup

The record `scenarios/validation.yml` holds one issue of each kind, against the schema `scenarios/validation.schema.yaml`. The items change the record cumulatively, and the section *Reset* restores it.

- [x] Run `npm run build` and `npm run test-vault` from the root of the repository, then restart Obsidian, or disable and enable *Ekphrasis* in *Settings → Community plugins*. → No error notice appears, and the console holds no line starting with `ekphrasis:`.
- [x] Open `scenarios/validation.yml`. Open it a second time in a pane on the right, through *Split right* in the tab menu, and switch the right pane to the source view. → The left pane shows the form, and the right pane the YAML text.

## Issues at opening

Each item below concerns the form of the left pane. A missing field takes the accent colour of the required marker, and an invalid value the colour of errors, both on the left edge of the field and in its message.

- [x] Look at the top of the form. → A box *Schema warnings* lists `(root)` with *The rule `spell-check` names no checker known to ekphrasis.* Below it, a red box reads *Validation: 3 missing fields, 9 invalid values and 1 warning.*, with no issue listed under it.
- [x] Field *status*. → *This required field is missing.*, in the accent colour.
- [x] Field *title*. → *The text must hold one line, without line breaks.*, in red.
- [x] Field *summary*. → *The text holds 8 words, whereas at most 5 are admitted.*, in orange.
- [x] Field *id*. → *The label must hold one word, without spaces.*, in red.
- [x] Field *count*. → *The value must be at least 1.*
- [x] Field *category*. → One message only: *The value must be one of: `noun`, `verb`.*
- [x] Field *code*. → *The text must match the pattern `^[a-z]+$`.*
- [x] Field *formula*. → A message starting with *The formula fails to render:*, followed by the error of MathJax, such as a missing close brace.
- [x] Field *tolerance* (absent). → *This field is required when `aim` equals `prediction`.*, in the accent colour.
- [x] Field *start*. → *The value `2026-10-13` must be at most `2026-10-01`, the value of `end`.*
- [x] Heading of the group *detail*. → A badge *1 issue* on the right of the heading. Field *detail → note* (absent). → *This required field is missing.*
- [x] Heading of the sequence *symbols*. → A badge *1 issue*. Field *symbols → #3*. → *The value `alpha` repeats the value of item #1.*
- [x] Area *Keys outside the schema*, at the end of the form. → The key *extra* carries *This key is outside the schema.*

## Issues after commits

Each commit validates the record again, so each item changes the issues at once, without a reload.

- [x] Field *count*: type `5`, then `Tab`. → The message of *count* disappears, and the summary reads *8 invalid values*.
- [x] Field *status*: choose *answered*. → The message of *status* disappears, and the summary reads *2 missing fields*.
- [x] Field *status*: choose the empty option. → The right pane shows `status: open`, and *status* shows *This required field is missing.* again.
- [x] Field *title*: replace the text by `One title`, then `Tab`. → The message of *title* disappears.
- [x] Field *formula*: replace the text by `\frac{a}{b}`, then `Tab`. → The message of *formula* disappears.
- [x] Field *symbols → #3*: replace `alpha` by `gamma`, then `Tab`. → The message disappears, and the badge of *symbols* with it.
- [x] Field *detail → note*: type `a note`, then `Tab`. → The message disappears, and the badge of *detail* with it.

## Conditions

- [x] Field *aim*: choose *explanation*. → The message of *tolerance* disappears. The red box at the top lists `explanans` with *This required field is missing.*, since the schema requires that field outside its properties.
- [x] Field *aim*: choose *description*. Field *tolerance*: type `0.1`, then `Tab`. → *tolerance* shows *This field must stay unfilled when `aim` equals `description`.*, in orange, and the top no longer lists `explanans`.
- [x] Field *tolerance*: delete its text, then `Tab`. → The message of *tolerance* disappears.

## Command *Validate instance*

- [x] Scroll the form to its end. Open the command palette (`Cmd+P`) and run *Ekphrasis: Validate instance*. → A notice reads *Ekphrasis: 1 missing field, 5 invalid values and 1 warning.*, the count of the summary box. The form scrolls to the first issue displayed.
- [x] Switch the left pane to the source view, then run *Validate instance*. → The left pane returns to the form, and the same notice appears.
- [x] Open `scenarios/unbound.yml`, and run *Validate instance*. → A notice reads *Ekphrasis: the instance has no form, so it was not validated.*

## Conditional rule of gnomon

This section verifies the exit criterion inside Obsidian. The question fixture binds to its schema by a path rule of the test vault, and its schema requires fields according to the epistemic aim.

- [x] Open `gnomon/question.yml`. → The summary reads *Validation: 1 missing field.* The heading of *task* carries *1 issue*, and the field *task → requested relation* shows *This field is required when `task.epistemic_aim` equals `explanation`.*
- [x] Field *task → epistemic aim*: choose *Modal knowledge*. → The message of *requested relation* disappears, and the sequence *task → proof obligations* shows *This field is required when `task.epistemic_aim` equals `modal-knowledge`.*
- [x] Field *task → epistemic aim*: choose *Prediction*. → The summary box disappears, since the record lists one output to match.
- [x] Field *task → epistemic aim*: choose the empty option. → The right pane, or the source view, shows `epistemic_aim: open`, and the field shows *This required field is missing.*

## Reset

To restore the records, run `npm run test-vault` from the root of the repository: it copies the scenario records and the fixtures afresh into the test vault.

## Observations

All the tests pass. The observations below are remarks for style and user friendlyness.

- Across all these tests, commits were automatic without needing to tab. That is acceptable, but I mention so that it is consistent with the expected behavior given the code.
- The current warning box reads `Validation: 3 missing fields, 8 invalid values and 1 warning`. It could be a more structured format rather than a sentence. For instance `missing fields: 3`, etc. Also, it could display a dropdown option to reveal the detailed list of fields that carry errors, so that the user can directly jump to them.
- The `open` option is misleading, it looks like an acceptable value. It would also be problematic if the keyword "open" becomes a real acceptable value in a certain field. It would be preferable to use a distinguished symbol, for instance "—".
- The options `Exploration (exploration)` and `Modal knowledge (modal-knowledge)` appears twice in the dropdown menu.
- When *aim*: *explanation*. → The red box at the top lists `explanans` with *This required field is missing.*, since the schema requires that field outside its properties. However it is not clear for the user, who might search for this field within the form and never find it.
- When *aim*: *description*. → *tolerance* shows *This field must stay unfilled when `aim` equals `description`.* It would be useful to dynamically block or unlock the fields together with a visual convention (e.g. gray) depending on eachother, so that the user does not have to discover the rule by try and error.
- The field "proof obligations" is not clear. It displays:
	```
	proof obligations
	- This field is required when `task.epistemic_aim` equals `modal-knowledge`.
	No items.
	```
	There is no visible option to add items. Maybe this was intended or planned in the future, but I mention it.
- In the source, replacing the title keeps a paragraph (although it is valid since it has a single line). Maybe it was intended, but I mention it to ensure this is indeed the expected behavior:
	```yaml
	title: |-
	  One title
	```
- In the `unbound.md` file, the message is a single, justified paragraph, that reads: "This file is bound to no schema, so it has no form. To bind it, write the line `# yaml-language-server: $schema=path/to/schema.yaml` at the top of the file, or add a path rule in the settings of ekphrasis." This could be more structured, with line breaks.
- In the future, a search bar would be useful to jump to a field and/or display documentation about it.
- In the future, vertical lines would be useful along the nested blocks, to delimitate distinct levels of nesting and clearly show which field belongs to each section, together with a collapse icon.