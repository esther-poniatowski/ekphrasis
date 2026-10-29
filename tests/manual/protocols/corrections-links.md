# Test protocol: Corrections after the check of Links

This checklist verifies inside Obsidian the corrections drawn from the check of the milestone *Links*, and runs again the item of that check that was not run:

- the parenthesis closing a Markdown link completed by a suggestion;
- the wikilink to an item, whose field path ends with a bracket, written with a displayed text;
- the place of a control while the instructions of its field show;
- the commands *Show all instructions* and *Hide all instructions*;
- the link by identifier opened from another application.

The roadmap steps of *Links* still open are ticked once their items pass. Each item states an action, then the expected result after the arrow. Tick an item when the result matches, and write any deviation under *Observations*, with the message of the developer console (`Cmd+Option+I`, tab *Console*) when the console shows a message.

> [!TIP] Rule for a failing item
> Record the deviation and continue with the next item. Stop only when the plugin fails to load, since every later item depends on it.

## Setup

The note `scenarios/corrections-links.md` holds the link of this protocol, and an empty line where the suggestions are tried. The records `scenarios/guidance.yml` and `scenarios/links.yml` are those of the [protocol of links](links.md).

- [x] Run `npm run build` and `npm run test-vault` from the root of the repository, then restart Obsidian, or disable and enable *Ekphrasis* in *Settings → Community plugins*. → No error notice appears, and the console holds no line starting with `ekphrasis:`.

## Closing parenthesis of a completed link

- [x] Open `scenarios/corrections-links.md` in the source mode. On the empty line at the end, type `[system](guidance.yml#subj`, without any closing parenthesis. Check that no `)` follows the cursor, since Obsidian may close the parenthesis by itself. → A list of suggestions shows, starting with `subject`.
- [x] Select `subject.system` with the arrow keys and `Enter`. → The line reads `[system](guidance.yml#subject.system)`, and the cursor stands after the closing parenthesis.
- [x] On a new line, type `[aim](guidance.yml#)`, place the cursor just before `)`, then type `subj`. Select `subject.system`. → The line reads `[aim](guidance.yml#subject.system)`, with one closing parenthesis, and the cursor stands after it.
- [x] Switch the note to the reading view, and click the first completed link. → The form of `guidance.yml` opens at the field *system*.

## Wikilink to an item

- [x] Open `scenarios/corrections-links.md` in the reading view. → Link 1 displays as one link reading *turbulent*, with no bracket left after it.
- [x] Click link 1. → The form of `links.yml` opens, the row *turbulent* of the table *Foils* is highlighted, and its cell *name* takes the focus.

## Place of a control while its instructions show

- [x] Open `scenarios/guidance.yml`. Click the help button beside the label *title*. → The instructions show in the row below the label and the input of *title*. The input keeps its place and its width, beside the label.
- [x] Click the information button in the header of the view. → The instructions of every field show, each in the row below its label and its control. No control moves below its label, and every control keeps the width of the column of controls.

## Commands on every instruction

- [x] Click the information button again, so that every instruction hides. Open the command palette (`Cmd+P`), and type *instructions*. → The palette lists *Ekphrasis: Show all instructions* and *Ekphrasis: Hide all instructions*, and no command *Show or hide all instructions*.
- [x] Run *Ekphrasis: Show all instructions*. → Every instruction shows, and the information button displays as active.
- [x] Run *Ekphrasis: Show all instructions* again. → Every instruction stays shown.
- [x] Run *Ekphrasis: Hide all instructions*. → Every instruction hides, and the information button no longer displays as active.

## Link by identifier from another application

The terminal reads the characters `?` and `&` of a URI as its own syntax, so the command must write the URI between single quotes, after the command `open`.

- [x] Open `scenarios/links.yml`, and run *Ekphrasis: Toggle form and source view*, so that its tab displays the source view. Keep that tab active.
- [x] In a terminal, run the command below, copied whole, with `open` and the single quotes. → Obsidian comes to the front, and the same tab displays the form of `scenarios/links.yml`, with the row *turbulent* of the table *Foils* highlighted.

```sh
open 'obsidian://ekphrasis?id=scenario.links&field=foils%5B1%5D'
```

## Reset

To restore the records, run `npm run test-vault` from the root of the repository: it copies the scenario records and the fixtures afresh into the test vault.

## Observations

### Run 1
