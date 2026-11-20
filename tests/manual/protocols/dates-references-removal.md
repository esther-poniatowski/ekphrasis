# Test protocol: Dates, references and removal

This checklist verifies inside Obsidian four behaviours that component tests reach only in a simulated document:

- the kinds `date` and `duration`, with their icons, their placeholders, the calendar of a date and the messages of an invalid value, as the [field kinds](../../../docs/features/field-kinds.md#^temporal-kinds) specify;
- the kind `reference`, with its suggestions, its check and the refresh of an open form when another record changes, as the [references](../../../docs/features/field-kinds.md#^reference-kind) specify;
- the action *Remove* of an optional field, as the [form view](../../../docs/features/form-view.md) and the [removed fields](../../../docs/features/saving.md#^removed-fields) specify;
- the clearing of an optional field of kind `markdown`, reported to stay in the form.

The roadmap steps of these behaviours are ticked once these items pass and the user ratifies the three proposed decisions. Each item states an action, then the expected result after the arrow. Tick an item when the result matches, and write any deviation under *Observations*, with the message of the developer console (`Cmd+Option+I`, tab *Console*) when the console shows one.

> [!TIP] Rule for a failing item
> Record the deviation and continue with the next item. Stop only when the plugin fails to load, since every later item depends on it.

## Setup

The records of this protocol lie in the folder `scenarios/kinds` of the test vault:

- `schemas.yml` is the registry, which maps `scenario:catalog@1` and `scenario:session@1` to their schemas;
- `catalog.yml` declares the streams `research` and `teaching` as the keys of a mapping, and the members `ana` and `ben` as the items of a sequence with an identifier field;
- `session.yml` names the stream `research` and the host `ana`, and holds a date, a duration, a boolean and a Markdown field `details` followed by a comment.

- [ ] Run `npm run build` and `npm run test-vault` from the root of the repository, then restart Obsidian, or disable and enable *Ekphrasis* in *Settings → Community plugins*. → No error notice appears, and the console holds no line starting with `ekphrasis:`.
- [ ] In *Settings → Ekphrasis*, set *Schema registry* to `scenarios/kinds/schemas.yml`. Open `scenarios/kinds/session.yml`. → The form titled *Session* displays without a box *Validation*.

## Dates and durations

- [ ] Look at the labels. → *Due* shows a calendar icon, *Length* a timer icon, and *Stream* and *Host* a crosshair icon. *Due* also shows a calendar button at the right of its input.
- [ ] Clear *Due*, and leave the control. Do the same for *Length*. → Both fields leave the form, since their keys left the file.
- [ ] Choose *Due*, then *Length*, from *+ Add a field*. → *Due* shows the placeholder `— YYYY-MM-DD`, and *Length* the placeholder `— ISO 8601, such as PT1H30M`.
- [ ] Click the calendar button of *Due*. → The calendar of the platform opens next to the button.
- [ ] Choose 20 November 2026 in the calendar. → The input reads `2026-11-20` at once, and the source holds `due: '2026-11-20'`.
- [ ] Click in the input of *Due*, and press `Cmd+Z`. → The input returns to its previous text, and the source follows.
- [ ] Type `2026-11` in *Due*, and leave the control. → The text stays visible, and the message below the control reads *The text must be a calendar date written `YYYY-MM-DD`, such as `2026-03-01`.* Clicking the calendar button opens a calendar on no selected date.
- [ ] Type `2 hours` in *Length*, and leave the control. → The message reads *The text must be an ISO 8601 duration, such as `PT1H30M`, `P3D` or `P2W`.* Type `PT2H` instead. → The message disappears, and the source holds `length: PT2H`.

## References

- [ ] Click in the input of *Stream*, then press `↓`, or click it twice. → A list offers `research` and `teaching`.
- [ ] Choose `teaching`. → The input reads `teaching`, and no message appears.
- [ ] Type `leisure` in *Stream*, and leave the control. → The text stays, and the message reads *`leisure` names no entry of `streams`, in the records bound to `scenario:catalog@1`.*
- [ ] Click in the input of *Host*. → The list offers `ana` and `ben`.
- [ ] Split the pane, and open `scenarios/kinds/catalog.yml` in the new pane. In its source view, add the stream `leisure` under `streams:`, as the line `  leisure: {}`, and let the file save. → Within about a second, and without an edit of `session.yml`, the message at *Stream* in the other pane disappears, and the list of *Stream* also offers `leisure`.
- [ ] Close the pane of `catalog.yml`. Quit Obsidian with `session.yml` open, and start it again. → While the vault loads, *Stream* shows no message naming a missing entry. Once the vault is loaded, its list offers the streams.

## Removal of optional fields

- [ ] Look at the actions of the fields. → *Stream*, *Host*, *Due*, *Length*, *Archived* and *Details* carry a button *Remove*; *Title*, which is required, carries none.
- [ ] Click *Remove* beside *Archived*. → The toggle leaves the form, and *+ Add a field* offers *Archived* again. The source holds no key `archived`.
- [ ] Click *Remove* beside *Details*. → The field leaves the form. The source holds no key `details`, and the line `# kept comment` remains, at the indentation of the removed key.
- [ ] Choose *Archived* from *+ Add a field*, turn the toggle on, then click *Remove*. → The field leaves the form, although it was revealed as a draft, and the source holds no key `archived`.

## Clearing an optional Markdown field

- [ ] Run `npm run test-vault`, set *Schema registry* to `scenarios/kinds/schemas.yml` again, and open `session.yml`. Click the rendered value of *Details*, clear its text, and leave the control. → The field leaves the form. The source holds no key `details`, and the line `# kept comment` remains.
- [ ] Choose *Note* from *+ Add a field*, type `A note`, and leave the control. Click the rendered value, clear the text, and leave the control. → The source holds no key `note`, while the empty control of *Note* stays with its button *Discard*, as the rule of drafts specifies. Click *Discard*. → The field leaves the form.
- [ ] Run `npm run test-vault`, set *Schema registry* to `scenarios/kinds/schemas.yml` again, and open `session.yml`. Click the rendered value of *Details*, clear its text, and wait three seconds without leaving the control. → Record whether the control keeps the focus, or leaves the form while the cursor is in it, since the commit after a pause of typing removes the key.

## Reset

To restore the records and the settings, run `npm run test-vault` from the root of the repository: it copies the scenario records afresh, and restores the setting *Schema registry* to empty.

## Observations
