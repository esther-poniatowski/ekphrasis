# Test protocol: Bound form

This checklist verifies the milestone *Bound form* inside Obsidian, before the milestone *Saving of scalars* starts. Each item states an action, then the expected result after the arrow. Tick an item when the result matches, and write any deviation under *Observations*, with the message of the developer console (`Cmd+Option+I`, tab *Console*) when one appears.

> [!TIP] Rule for a failing item
> Record the deviation and continue with the next item. Stop only when the plugin fails to load, since every later item depends on it.

## Loading

- [x] Open *Settings → Community plugins*. → *Ekphrasis* is listed and enabled, and no error notice appeared at start.
- [x] Look at the console. → No line starts with `ekphrasis:`.
- [x] Look at the file explorer. → The files `.yml` and `.yaml` of the folders `gnomon`, `geonexus`, `constructs` and `scenarios` are listed.

## Form of the showcase record

Open `scenarios/showcase.yml`.

- [x] Header of the form. → Title *Showcase*, then the line *Schema scenarios/showcase.schema.yaml, named by the modeline.*
- [x] Top of the form. → One warning: *odd: The keyword x-kind names no field kind: "formula".*
- [x] Labels. → *Identifier* and *title* carry an asterisk; no other label does.
- [x] Fields `summary`, `formula`, `odd`, `id`. → Single-line inputs, holding the raw text (the formula as LaTeX source, unrendered).
- [x] Field `notes`. → A multi-line input holding two paragraphs.
- [x] Field `count`. → A numeric input holding `3`.
- [x] Field `draft`. → A checked, greyed checkbox.
- [/] Field `status`. → A dropdown showing *Final (final)*; its list also holds *Draft (draft)*, and hovering an option shows its description.
- [/] Field `category`. → A dropdown showing *adjective (not admitted)*, followed by *noun* and *verb*.
- [x] Field `empty_hint`. → An empty input, with the grey placeholder *An example displayed as placeholder*.
- [x] Field `shape`. → Monospace text `nested: value`, with no input.
- [/] Section `settings`. → *unit* `radian` with the badge *merge*, *precision* `4` without badge, *gravity* `9.81` with the badge *alias*; hovering a badge explains where to edit the value.
- [x] Section `tags`. → Two items, *#1* `alpha` and *#2* `beta`.
- [x] End of the form. → The area *Keys outside the schema* lists `defaults` and `nominal` with their YAML text.
- [x] Type into any input. → The value does not change, since the form is read-only in this milestone.
- [x] Switch the theme between light and dark (*Settings → Appearance*). → Labels, inputs and badges stay legible in both.

## Switching views

Stay on `scenarios/showcase.yml`.

- [x] Click the code icon at the top right of the view. → The source view opens, with line numbers and coloured keys, strings and comments; the icon becomes a list icon with the tooltip *Open the form view*.
- [x] In the source view, press `Tab` at the start of a line, then `Cmd+Z`. → Two spaces are inserted, then removed.
- [x] Change `count: 3` to `count: 5`, wait three seconds, and click the list icon. → The form shows `5` in the field `count`.
- [x] Run the command *Ekphrasis: Toggle form and source view* from the command palette (`Cmd+P`), twice. → The view switches to the source, then back to the form.
- [x] Close the tab, and reopen the file from the file explorer. → The form still shows `5`, so the edit was saved to the file. Restore `count: 3` in the source view afterwards.
- [x] Leave the view in the source mode, then reload Obsidian (command *Reload app without saving*). → The file reopens in the source mode.

## Binding

- [x] Open `gnomon/target-system.yml`. → A form whose header names the schema *gnomon/schemas/target-system.schema.yaml, named by the modeline*.
- [x] Open `gnomon/question.yml`. → A form whose header ends with *named by a path rule*; the rule was written in the settings of this vault beforehand.
- [x] Open `geonexus/glossary.yml`. → The source view, since no rule binds the file yet.
- [x] Open *Settings → Ekphrasis*, click *Add a path rule*, and fill the pattern `**/{glossary,*.glossary}.yml` and the schema `geonexus/schemas/glossary.schema.yaml`. Return to the glossary tab. → Within a second, the tab shows the form of the glossary, with the sections `terms` and `forbidden`.
- [x] In the settings, click the arrow of rule 2. → The two rules swap places, and both forms still open.
- [x] Remove the glossary rule with its bin icon, and return to the glossary tab. → The tab returns to the source view.
- [x] Open `scenarios/unbound.yml`, `gnomon/vocabulary.yml` and `constructs/anchors.yml`. → Each opens in the source view.
- [x] In `scenarios/unbound.yml`, click the list icon. → The message *No schema*, explaining the modeline and the path rules, with the button *Open the source view*, which switches back.

## Error messages

- [x] Open `scenarios/broken-yaml.yml`. → The message *Invalid YAML*, naming line 5 and column 1.
- [x] Click *Open the source view*, add `]` after `beta` on line 4, wait three seconds, and click the list icon. → The form of the record appears.
- [x] Open `scenarios/missing-schema.yml`. → The message *Schema not loaded*, naming `scenarios/no-such.schema.yaml`.
- [x] Open `scenarios/remote-schema.yml`. → The message *Schema not found*, ending with *remote schemas are not supported*.
- [x] Open `scenarios/showcase.yml` in one pane and `scenarios/showcase.schema.yaml` in a split pane (`Cmd+click` on the file). In the schema, change `title: Showcase` to `title: Showcase edited`, and wait three seconds. → The form in the other pane shows the title *Showcase edited* without being reopened.

## Extension conflict

This part installs a second plugin in the test vault only.

- [x] In *Settings → Community plugins*, disable *Ekphrasis*. Browse, install and enable *YAML Editor*. Then enable *Ekphrasis* again. → A notice states that another plugin already opens `.yaml` and `.yml` files, names YAML Editor and YAML Databases, and cites the command *Open in ekphrasis*.
- [x] Open `scenarios/showcase.yml`. → The file opens in the view of YAML Editor.
- [x] Run the command *Ekphrasis: Open in ekphrasis*. → The same tab shows the form of the showcase record.
- [x] Disable *YAML Editor*, and reload Obsidian. → No notice appears, and `scenarios/showcase.yml` opens as a form again.

## Observations (1)

- [TEST] **CRUCIAL**: The form is read-only, it is not dynamically editable, so several checks could not be completed.
- [STYLE] Between the title of the form and the schema specification, add more space.
- [STYLE] The error message should be formatted so that it is clearly interpreted as reporting errors. Currently, the name of the field (here "odd") is not visually distinguished from the issue statement, so it reads as a plain text word.
- [TEST] In the test "Fields `summary`, `formula`, `odd`, `id`.", I assumed `id` meant `identifier`, since no `id` field appears.
- [STYLE] The field `empty_hint` could be displayed `empty hint` like the other fields.
- [BEHAVIOR] Field `status`: I could not check the full list beyond the preselected valud, since the dropdown is not dynamically clickable .
- [BEHAVIOR] Section `settings`: hovering a badge has no effect, it yields no dynamic explanation.
- [STYLE] The nesting fields `settings` and `tags` display in bold font, while the flat ones at the root level do not. Fields appearance should be homogeneized.
- [STYLE] The sentence *Keys outside the schema* should be preceded by a gray line and have more space below it. 
- [STYLE] *Settings → Ekphrasis* → *Add a path rule*, the role of the two fields could be specified above them (glob pattern, schema path).
- [STYLE] The message *Invalid YAML* does not visually distinguish the statement of the error from the quotation of the source strings: `tags: [alpha, beta` display without backticks. Likewise, the message *Schema not loaded* does not use backticks to distinguish the paths.

## Re-check of the corrections

Reload the plugin first: turn *Ekphrasis* off and on in *Settings → Community plugins*.

- [x] `scenarios/showcase.yml`, header. → More space separates the title *Showcase* from the line *Schema `scenarios/showcase.schema.yaml`, named by the modeline.*, whose path displays as code.
- [x] Same file, top of the form. → An orange frame titled *Schema warnings*, listing the path `odd` as code, followed by *The keyword `x-kind` names no field kind: `formula`.*
- [x] Field `empty_hint`. → The label reads *empty hint*.
- [x] Field `status`. → The description *Reviewed and closed* displays below the dropdown.
- [/] Hover the badges *merge* and *alias* in the section `settings`. → A tooltip explains where to edit the value.
- [x] Sections `settings` and `tags`. → Their labels have the same weight as the labels of the other fields.
- [x] End of the form. → A grey line precedes *Keys outside the schema*, and space separates that heading from the keys.
- [x] `scenarios/broken-yaml.yml` (restore the missing `]` beforehand if it was added). → The message gives line 5 and column 1 once, the reason on its own line, and the faulty line `5 | count: 3` in a code frame with a caret under its first character.
- [x] `scenarios/missing-schema.yml`. → The path `scenarios/no-such.schema.yaml` displays as code, in both sentences of the message.
- [x] *Settings → Ekphrasis*. → Each rule shows the labels *Glob pattern* and *Schema path* above its two inputs.

## Observations (2)

- [BEHAVIOR] Section `settings`: hovering a badge still has no effect.
- [STYLE] For the error message in `scenarios/broken-yaml.yml`: the "Open in YAML" button should be below the error code frame hint. The text "with a ]" should be formulated "with a ] symbol", and similarly anywhere avoid for other occurrences of bare symbols.

## Second re-check

Reload the plugin first.

- [/] In `scenarios/showcase.yml`, hover the badges *merge* and *alias* of the section `settings`. → An Obsidian tooltip explains where to edit the value.
- [x] Open `scenarios/broken-yaml.yml`. → The reason reads *… end with a `]` symbol*, with `]` as code, and the button *Open the source view* stands below the code frame.

## Fourth re-check

Reload the plugin first.

- [ ] Fields *unit* and *gravity* of the section `settings`. → A small circled question mark follows each label, with no text badge.
- [ ] Click a question mark, then click it again. → The note appears under the field, then hides; the symbol takes the accent colour while its note is shown.

## Observations (3)

- [BEHAVIOR] Section `settings`: hovering a badge still has no effect.

## Third re-check

Reload the plugin first.

- [x] In `scenarios/showcase.yml`, click the badges *merge* and *alias* of the section `settings`, then click them again. → The first click shows, under the field, a muted note explaining where to edit the value; the second click hides it.
- [x] Press `Tab` until a badge is focused, then `Enter`. → The note of that badge toggles.

## Observations (3)

- [STYLE] Section `settings`: the badges *merge* and *alias* are specific terms that are not intuitive nor evocative. Replace by a uniform symbol, for instance a question mark in a circle, or any other clear symbol.

## Fourth re-check

Reload the plugin first.

- [x] Fields *unit* and *gravity* of the section `settings`. → A small circled question mark follows each label, with no text badge.
- [x] Click a question mark, then click it again. → The note appears under the field, then hides; the symbol takes the accent colour while its note is shown.
