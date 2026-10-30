# Test protocol: Form presentation

This checklist verifies inside Obsidian the presentation of the form and of the outline, drawn from the pilot on the contacts and the exchanges of geonexus:

- the rows of fields, each with the icon of its kind, its name in bold and its control;
- one font size and one appearance for every control holding text;
- the arrow of a dropdown, the help buttons of the labels, and those of the headers of a table;
- the descriptions of the options of a choice, shown with the instructions of the field;
- the empty collections, displayed without a message;
- the light guide along each nested group;
- the long single-line values, wrapped in their inputs and kept on one line in the file;
- the outline, opened in the right sidebar with the plugin, in the style of the outline of Obsidian, without the items of the lists of scalars.

The roadmap steps of *Form presentation* are ticked once their items pass. Each item states an action, then the expected result after the arrow. Tick an item when the result matches, and write any deviation under *Observations*, with the message of the developer console (`Cmd+Option+I`, tab *Console*) when the console shows a message.

> [!TIP] Rule for a failing item
> Record the deviation and continue with the next item. Stop only when the plugin fails to load, since every later item depends on it.

## Setup

The record `scenarios/presentation.yml` holds one field of each kind, bound to `scenarios/presentation.schema.yaml` by its modeline. Its collections *aliases*, *steps*, *terms* and *sources* are empty, and its fields *keywords*, *aliases* and *history › notes* are lists of scalars.

- [ ] Run `npm run build` and `npm run test-vault` from the root of the repository, then quit Obsidian and open the test vault again. → No error notice appears, and the console holds no line starting with `ekphrasis:`.

## Outline in the right sidebar

- [ ] Before opening any file, look at the tabs of the right sidebar. → One tab shows the icon of the outline of ekphrasis, a tree of lines, beside the tabs of the outline and of the backlinks of Obsidian. No command was run.
- [ ] Open `scenarios/presentation.yml`, then click the tab of the outline of ekphrasis. → The panel lists the entries of the form of `presentation.yml`.
- [ ] Open `scenarios/guidance.yml` in the same pane. → The panel lists the entries of `guidance.yml`, without any command.
- [ ] Open `scenarios/presentation.yml` again.

## Rows of fields

- [ ] Look at the rows of the form. → Each row opens with an icon at the left of the name, the name in bold, then the control in the remaining width. The rows are close together, as the properties of a note.
- [ ] Compare the icons with the table of the [icons of the kinds](../../../docs/features/form-view.md#^kind-icons). → The icon of each row is that of its kind: for instance, *title* shows the icon of the text properties of Obsidian, *count* that of the numbers, *done* that of the checkboxes, and *keywords* that of the lists.
- [ ] Look at the headings of the groups and collections, such as *context*, *measures* and *history*. → Each heading shows the chevron folding it, then the icon of its kind and its name in bold.

## Controls holding text

- [ ] Look at the controls of *code*, *title*, *abstract*, *count*, *summary*, *prose*, *formula* and *status*. → Every control shows the same font size, a white fill, a gray border and rounded corners. No control shows a white box over a gray area, and none shows a gray fill.
- [ ] Look at the cells of the table *measures*. → The inputs and the dropdowns of the cells show the same font size and the same appearance as the controls of the rows.

## Dropdowns and help buttons

- [ ] Compare the dropdown of *status* with the input of *title* above it. → Both start and end at the same horizontal positions and have the same height, and the arrow of the dropdown lies inside its frame.
- [ ] Look at the labels holding a help button, such as *code*, *title*, *status* and *context*. → In each row, the help button stands at the right end of the label column, so the help buttons of the rows form one vertical line, next to the controls.
- [ ] Look at the header of the table *measures*. → Each help button stands apart from the name of its column, by a visible gap.

## Descriptions of the options

- [ ] Look at the row *status*. → No description of an option shows below the dropdown or elsewhere in the row.
- [ ] Click the help button of *status*. → The instructions show below the row: *The state of the record.*, then *Options* listing *Posed (posed): The question awaits an answer.* and *Answered (answered): An answer is recorded.* The option *Dropped*, which has no description, is not listed.
- [ ] Click the help button of *aspects*. → Its instructions list *Spatial (spatial)* and *Temporal (temporal)* with their descriptions.
- [ ] Look at the cells *accuracy* of the table *measures*. Click the help button of the column *accuracy*. → No description shows in the cells. After the click, the instructions of the column show above the table, with *rough* and *fine* and their descriptions.
- [ ] Hide these instructions, then click the information button in the header of the view. → The instructions of every field show, the options of *status*, *aspects* and *accuracy* included. Click the button again. → They all hide.

## Empty collections

- [ ] Look at the sections *aliases*, *steps*, *terms* and *sources*. → None shows a message such as *No items.*, *No rows.* or *No entries.*: *aliases* and *steps* show their button adding an item or a row, and *terms* and *sources* their input naming a new entry.

## Guide along the nested groups

- [ ] Look at the vertical line at the left of the fields of *context* and of its group *setting*. → The line is fainter than the line under the heading of *context*.
- [ ] Move the pointer over the fields of *setting*. → Its line darkens while the pointer stays over the group.

## Long single-line values

- [ ] Look at the field *abstract*. → Its value wraps onto several lines inside the input, which grows to show the whole value, and its end is visible.
- [ ] Narrow the pane by dragging the edge of the right sidebar to the left. → The value of *abstract* wraps again, and the input keeps showing the whole value. Restore the width.
- [ ] Click at the end of the value of *abstract*, type ` More.`, then press `Enter`. → No line break is inserted, the cursor stays in the input, and the value ends with *More.*
- [ ] Click the rendered value of *prose*, select its two lines with the mouse in the editor that opens, and copy them with `Cmd+C`. Click at the end of the value of *title*, type a space, and paste with `Cmd+V`. → The pasted text joins the value on the same line: *Onset of oscillation First line of the prose. Second line of the prose.*
- [ ] Click the rendered value of *summary*, type ` again` at its end, and press `Enter`. → No line break is inserted, and the value is saved: leaving the field renders *A line with emphasis that the form renders again*, with *emphasis* in italics.
- [ ] Run *Ekphrasis: Toggle form and source view*. → The source view shows `abstract:`, `title:` and `summary:` each on one line, with the text typed and pasted above. Run the command again to return to the form view.

## Style of the outline

- [ ] Open the outline of ekphrasis, then the outline of Obsidian on any note, such as `scenarios/linked-note.md`, and compare them. Return to `scenarios/presentation.yml` and to the outline of ekphrasis. → The entries take the font, the size and the colour of the entries of the outline of Obsidian, with the same triangles folding the entries and the same faint guides along the nested entries.
- [ ] Click the triangle of the entry *context*. → Its entries fold, the triangle turns to the right, and the form does not move.
- [ ] Click the name *place* under *context*, after unfolding it. → The form moves to the field *place*, and its entry is highlighted in the outline.

## Lists of scalars in the outline

- [ ] Look at the entries *keywords* and *aliases*. → Neither carries a triangle nor any entry below it: the values *oscillation*, *damping* and *resonance* are not listed.
- [ ] Unfold the entry *history*, then the entry of its first item. → The entry *notes* carries no entry below it.

## Outline after a restart

- [ ] Quit Obsidian and open the test vault again. → The right sidebar holds one tab of the outline of ekphrasis, beside the outline and the backlinks of Obsidian, and no second one.
- [ ] Open `scenarios/presentation.yml`, then click the tab of the outline of ekphrasis. → The panel lists the entries of `presentation.yml`.

## Contact record of geonexus

This section checks the exit criterion of the milestone in the vault of geonexus, with the build of this run installed there.

- [ ] Open a contact record of geonexus. → Every field displays as a row with its icon, its name and its control, and no control is shifted by a dropdown or a help button. The outline shows in the right sidebar.

## Reset

To restore the records, run `npm run test-vault` from the root of the repository: it copies the scenario records and the fixtures afresh into the test vault.

## Observations

### Run 1
