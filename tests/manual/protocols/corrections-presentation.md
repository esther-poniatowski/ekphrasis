# Test protocol: Corrections after the check of Form presentation

This checklist verifies inside Obsidian the corrections drawn from the check of the milestone *Form presentation*:

- the descriptions of the options of a choice, listed on one column;
- the fold button of a heading, in the margin at the left of its icon;
- the help button of a heading, in line with the help buttons of the fields;
- the headings of the groups and the collections, without a line under them.

The roadmap steps of these corrections are ticked once their items pass. Each item states an action, then the expected result after the arrow. Tick an item when the result matches, and write any deviation under *Observations*, with the message of the developer console (`Cmd+Option+I`, tab *Console*) when the console shows a message.

> [!TIP] Rule for a failing item
> Record the deviation and continue with the next item. Stop only when the plugin fails to load, since every later item depends on it.

## Setup

The record `scenarios/presentation.yml` is the record of the [protocol of form presentation](form-presentation.md).

- [ ] Run `npm run build` and `npm run test-vault` from the root of the repository, then restart Obsidian, or disable and enable *Ekphrasis* in *Settings → Community plugins*. → No error notice appears, and the console holds no line starting with `ekphrasis:`.

## Options on one column

- [ ] Open `scenarios/presentation.yml`, and click the help button of *status*. → Under *Options*, *Posed (posed)* and *Answered (answered)* form a first column, and their descriptions start on one vertical line, as the messages of the box *Schema warnings* start after their paths.
- [ ] Click the help button of the column *accuracy* in the header of the table *measures*. → The options *rough* and *fine* form a first column, and their descriptions start on one vertical line.

## Headings of the sections

- [ ] Compare the headings *keywords*, *context* and *measures* with the row *code*. → The icon and the name of each heading start at the same horizontal position as the icon and the name of *code*. The chevron of each heading stands in the margin at the left of its icon.
- [ ] Look at the group *setting* inside *context*, and at the field *place* above it. → The icon of *setting* starts at the same horizontal position as the icon of *place*. The chevron of *setting* stands at the left of its icon, to the right of the vertical guide of *context*.
- [ ] Compare the help buttons of *context* and *measures* with those of *code* and *title*. → The four help buttons stand on one vertical line.
- [ ] Look under the headings *context*, *measures* and *history*. → No horizontal line runs under a heading. A vertical guide runs down from under the chevron of each unfolded heading, along its fields.
- [ ] Look at the chevrons and the help buttons of the form. → Each shows its icon only, with no gray box behind it.
- [ ] Narrow the pane by dragging the edge of the right sidebar to the left. → The help buttons of *context* and *measures* stay on the vertical line of those of *code* and *title*. Restore the width.
- [ ] Click the chevron of *context*. → The group folds, and the chevron turns to the right without moving the icon or the name. Click it again to unfold the group.

## Reset

To restore the records, run `npm run test-vault` from the root of the repository: it copies the scenario records and the fixtures afresh into the test vault.

## Observations

### Run 1
