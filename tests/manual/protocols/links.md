# Test protocol: Links

This checklist verifies inside Obsidian the field links of the milestone *Links*, as the specification of [links](../../docs/features/links.md) states them:

- the following of a field link by path, from a note and from a value of a form;
- the following of a field link by identifier, through the URIs `obsidian://ekphrasis?…`, from a note, from a value and from another application;
- the links of a value resolved as in a note, external links included;
- the suggestions of field paths in a Markdown link;
- the command *Copy link to field*, in each link format of Obsidian;
- the index of identifiers kept up to date after an edit, a rename and a change of the path rules;
- the command and the button showing or hiding every instruction.

Two sections settle the questions left open by the unit tests. The first asks whether Obsidian closes a wikilink whose field path ends with a bracket at its final `]]`. The second asks whether a link written from the vault root resolves from a note stored in a subfolder. The roadmap steps of *Links* are ticked once their items pass. Each item states an action, then the expected result after the arrow. Tick an item when the result matches, and write any deviation under *Observations*, with the message of the developer console (`Cmd+Option+I`, tab *Console*) when the console shows a message.

> [!TIP] Rule for a failing item
> Record the deviation and continue with the next item. Stop only when the plugin fails to load, since every later item depends on it.

## Setup

The records of this protocol lie in the folder `scenarios` of the test vault:

- `field-links.md` holds thirteen numbered links followed from a note;
- `links.yml`, bound to `links.schema.yaml` by its modeline, holds fourteen numbered links in its values. Its schema names the field `id` as the identifier of the record, `scenario.links`, through the keyword `x-identifier`;
- `twin-a.yml` and `twin-b.yml` both declare the identifier `scenario.twin`;
- `link-target.md` holds the heading *Second section* and the block `^block-a`, reached by the links of `links.yml`;
- `notes with space/spaced note.md` is reached by a path whose spaces are written `%20`;
- `nested/deep/vault-root-links.md` holds links written from the vault root.

The record `gnomon/question.yml` is bound to its schema by the path rule of the settings, and declares the identifier `quest.pendulum.sustained-oscillation`.

- [ ] Run `npm run build` and `npm run test-vault` from the root of the repository, then restart Obsidian, or disable and enable *Ekphrasis* in *Settings → Community plugins*. → No error notice appears, and the console holds no line starting with `ekphrasis:`.
- [ ] In *Settings → Files and links*, turn *Use [[Wikilinks]]* on, and set *New link format* to *Shortest path when possible*. → The two settings hold these values.

## Links by path from a note

- [ ] Open `scenarios/field-links.md` in the reading view. Click link 1, `[[guidance.yml#subject.system]]`. → The form of `scenarios/guidance.yml` opens, the group *subject* unfolds, and the control of *system* takes the focus, highlighted briefly.
- [ ] Return to the note with the back arrow of the tab. Click link 2, `[[guidance.yml#rows[1].name]]`. → The form of `guidance.yml` opens, and the cell *name* of the row *damping* takes the focus.
- [ ] Return to the note. Click link 3, the Markdown link to `guidance.yml#subject.system`. → The form moves to the field *system*, as for link 1.
- [ ] Return to the note. Click link 4, the Markdown link to `../gnomon/question.yml#task.epistemic_aim`. → The form of `gnomon/question.yml` opens, and the control of *epistemic aim* takes the focus.
- [ ] Return to the note. Click link 5, whose field path `nested[%22a%20key%22]` is percent-encoded. → The form of `scenarios/links.yml` opens, and the control of *a key* takes the focus.
- [ ] Return to the note. Click link 7, to the field `subject.missing`. → The form of `guidance.yml` opens at its top, and the notice *Ekphrasis: the instance holds no field `subject.missing`, so the form opens at its top.* shows.
- [ ] Return to the note. Click link 8, whose field path `subject..system` is malformed. → The form of `guidance.yml` opens at its top. A notice states that the link `#subject..system` holds a malformed field path, and that the form opens at its top.
- [ ] Return to the note. Switch it to the live preview, and click link 2 there. → The form moves to the cell *name* of the row *damping*, as in the reading view.

## Wikilink ending with a bracket

This section settles the first open question: whether Obsidian closes the wikilink `[[links.yml#foils[1]]]` at its final `]]`, as the parser of field links of ekphrasis does.

- [ ] Return to `field-links.md`, switch it to the reading view, and look at link 6. → The link displays as one link, with no bracket left after it. Write under *Observations* the text displayed.
- [ ] Click link 6. → The form of `links.yml` opens, the row *turbulent* of the table *Foils* is highlighted, and its cell *name* takes the focus. Write under *Observations* the notice shown instead, if any.

## Links by identifier

- [ ] Return to `field-links.md`, in the reading view. Click link 9, the URI naming `quest.pendulum.sustained-oscillation` and the field `task.epistemic_aim`. → The form of `gnomon/question.yml` opens, the control of *epistemic aim* takes the focus, and no other window or application opens.
- [ ] Return to the note. Click link 10, whose field `subject.contrast.foil_set%5B1%5D` designates the second foil. → The form of `gnomon/question.yml` opens, the item *#2* of *foil set*, holding *aperiodic motion*, is highlighted, and its fold button takes the focus.
- [ ] Return to the note. Click link 11, to the identifier `scenario.twin`. → No file opens, and a notice states that the identifier `scenario.twin` is declared by several files, then lists `scenarios/twin-a.yml` and `scenarios/twin-b.yml`.
- [ ] Click link 12, to the identifier `scenario.nobody`. → No file opens, and the notice *Ekphrasis: no record of the vault declares the identifier `scenario.nobody`.* shows.
- [ ] Click link 13, a URI without the parameter `id`. → No file opens. A notice states that the parameter `id` of the link `obsidian://ekphrasis` is absent or empty.
- [ ] Switch `field-links.md` to the live preview, and click link 9 there. → The form of `gnomon/question.yml` opens at *epistemic aim*, as in the reading view.
- [ ] Open `scenarios/twin-a.yml`, and run *Ekphrasis: Toggle form and source view*. → The source view of `twin-a.yml` displays.
- [ ] Keep that tab active, and run `open 'obsidian://ekphrasis?id=scenario.links&field=foils%5B1%5D'` in a terminal. → Obsidian comes to the front, and the same tab displays the form of `scenarios/links.yml`, with the row *turbulent* highlighted and its cell *name* focused.

## Links in values

These items verify that the links of a value resolve as in a note stored in the folder of the instance. After an item leaves `links.yml`, the next item opens with a return to it by the back arrow of the tab.

- [ ] Open `scenarios/links.yml`. → The form titled *Links* displays without a box of issues, and the values *by path*, *by identifier*, *notes* and *external* display rendered, each link underlined as in a note.
- [ ] Field *by path*: click link 1, `[[guidance.yml#subject.system]]`. → The form of `guidance.yml` opens at the field *system*.
- [ ] Return to `links.yml`. Field *by path*: click link 2. → The form of `guidance.yml` opens at the cell *name* of the row *damping*.
- [ ] Return to `links.yml`. Field *by path*: click link 3, to `../gnomon/question.yml#task.epistemic_aim`. → The form of `gnomon/question.yml` opens at *epistemic aim*.
- [ ] Return to `links.yml`. Field *by path*: click link 4, to `subject.missing`. → The form of `guidance.yml` opens at its top, with the notice naming `subject.missing`.
- [ ] Return to `links.yml`. Field *by path*: click link 5, whose field path `subject..system` is malformed. → No file opens: `links.yml` stays displayed, and a notice states that the link `#subject..system` holds a malformed field path.
- [ ] Field *by path*: `Cmd`-click link 1. → The form of `guidance.yml` opens in a new tab, at the field *system*.
- [ ] Close the new tab, and return to `links.yml`. Field *by identifier*: click link 6. → The form of `gnomon/question.yml` opens at *epistemic aim*.
- [ ] Return to `links.yml`. Field *by identifier*: click link 7. → No file opens, and the notice lists `scenarios/twin-a.yml` and `scenarios/twin-b.yml`.
- [ ] Field *by identifier*: click link 8. → No file opens, and the notice names `scenario.nobody`.
- [ ] Field *notes*: click link 9, `[[link-target]]`. → The note `scenarios/link-target.md` opens.
- [ ] Return to `links.yml`. Field *notes*: click link 10, to the heading *Second section*. → `link-target.md` opens, scrolled to the heading *Second section*.
- [ ] Return to `links.yml`. Field *notes*: click link 11, to the block `^block-a`. → `link-target.md` opens, with the paragraph *A paragraph reached by a link to its block.* highlighted.
- [ ] Return to `links.yml`. Field *notes*: click link 12, whose path `notes%20with%20space/spaced%20note.md` encodes its spaces. → The note `scenarios/notes with space/spaced note.md` opens.
- [ ] Return to `links.yml`. Field *notes*: click link 13, the Markdown link to `link-target.md#Second%20section`. → `link-target.md` opens at the heading *Second section*.
- [ ] Return to `links.yml`. Field *external*: click link 14, `https://obsidian.md`. → The page opens in the default browser, and `links.yml` stays displayed in Obsidian.
- [ ] Look at the file explorer. → No note was created by the clicks of this section, such as `guidance.md`.

## Suggestions of field paths

- [ ] Open `scenarios/field-links.md` in the live preview. On a new line at the end of the note, type `[system](guidance.yml#`. → A list of suggestions shows the field paths of `guidance.yml`, such as `title`, `subject.system` and `rows[1].name`. Below each path, the names of its entries display, such as `subject › system`.
- [ ] Type `sub`. → The list holds `subject`, `subject.system` and `subject.note` only.
- [ ] Select `subject.system` with the arrow keys and `Enter`. → The line reads `[system](guidance.yml#subject.system`, followed by `)` when Obsidian closed the parenthesis.
- [ ] Write `)` at the end of the line if it is absent, switch to the reading view, and click the link. → The form of `guidance.yml` moves to *system*.
- [ ] Return to `field-links.md`, in the live preview. On a new line, type `[a key](links.yml#nes`, then select `nested["a key"]`. → The line reads `[a key](links.yml#nested["a%20key"]`, the space written `%20`.
- [ ] On a new line, type `[[guidance.yml#`. → No suggestion of ekphrasis shows; Obsidian shows its own suggestion of headings, or *No match found*.
- [ ] On a new line, type `[x](link-target.md#`. → No suggestion of ekphrasis shows.
- [ ] Delete every line typed in this section. → `field-links.md` holds its thirteen links again.

## Command Copy link to field

Each item compares the clipboard with the expected text, for instance by pasting it into the search field of Obsidian. A row of a table holds buttons moving and removing the row at its end: the items that move the focus to them must not press them.

- [ ] Open `scenarios/guidance.yml`, and click the input of the field *title*. Run *Ekphrasis: Copy link to field* from the command palette (`Cmd+P`). → The notice *Link copied: [[guidance.yml#title|title]]* shows, and the clipboard holds that wikilink.
- [ ] Table *rows*: click the cell *name* of the row *damping*, and run the command. → The clipboard holds `[[guidance.yml#rows[1].name|name]]`.
- [ ] Table *rows*: click the cell *name* of the row *damping*, press `Tab` until a button of the actions of that row takes the focus, without pressing it, and run the command. → The clipboard holds `[[guidance.yml#rows[1]|rows #2]]`. Write under *Observations* the link copied if it differs.
- [ ] Open `scenarios/field-links.md` in the source mode, and paste the link on a new line at the end. → The line holds the link copied.
- [ ] Switch `field-links.md` to the reading view, and click the pasted link. → The form of `guidance.yml` opens, the row *damping* is highlighted, and its cell *name* takes the focus.
- [ ] Open `scenarios/links.yml`, click the input of *a key*, and run the command. → The clipboard holds `[a key](obsidian://ekphrasis?id=scenario.links&field=nested%5B%22a%20key%22%5D)`, a link by identifier, since the record declares the identifier `scenario.links`.
- [ ] Table *Foils*: click the cell *name* of the row *turbulent*, press `Tab` until a button of the actions of that row takes the focus, without pressing it, and run the command. → The clipboard holds `[Foils #2](obsidian://ekphrasis?id=scenario.links&field=foils%5B1%5D)`.
- [ ] Open `scenarios/field-links.md` in the source mode, and paste the link on a new line at the end. → The line holds the link copied.
- [ ] Switch `field-links.md` to the reading view, and click the pasted link. → The form of `links.yml` opens, the row *turbulent* is highlighted, and its cell *name* takes the focus.
- [ ] Open `scenarios/twin-a.yml`, click the input of *note*, and run the command. → The clipboard holds `[[twin-a.yml#note|note]]`, a link by path, since the identifier `scenario.twin` designates two files.
- [ ] Open `scenarios/field-links.md`, open the command palette, and type *Copy link to field*. → The command is absent, since no form holds the focus.
- [ ] Delete the two lines pasted into `field-links.md`. In *Settings → Files and links*, turn *Use [[Wikilinks]]* off. Open `scenarios/guidance.yml`, click the cell *name* of the row *damping*, and run the command. → The clipboard holds `[name](guidance.yml#rows[1].name)`. Write under *Observations* the link copied if it differs.
- [ ] Open `scenarios/links.yml`, click the input of *a key*, and run the command. → The clipboard holds the link by identifier copied from *a key* earlier, unchanged by the link format.
- [ ] Open `scenarios/twin-a.yml`, click the input of *note*, and run the command. → The clipboard holds `[note](twin-a.yml#note)`.

## Links written from the vault root

This section settles the second open question. The question asks whether a link whose path starts from the vault root, as the command writes it, resolves from a note stored in a subfolder while Obsidian writes relative paths.

- [ ] In *Settings → Files and links*, keep *Use [[Wikilinks]]* off, and set *New link format* to *Relative path to file*. Open `scenarios/twin-a.yml`, click the input of *note*, and run the command. → The clipboard holds a Markdown link to `scenarios/twin-a.yml#note`. Write the link copied under *Observations*.
- [ ] Open `scenarios/nested/deep/vault-root-links.md` in the source mode, and paste the link at the end. Switch to the reading view, and click the link. → The form of `scenarios/twin-a.yml` opens at the field *note*. Write under *Observations* the note created instead, if any.
- [ ] Return to `vault-root-links.md`. Click link 1, `[aim](gnomon/question.yml#task.epistemic_aim)`. → The form of `gnomon/question.yml` opens at *epistemic aim*.
- [ ] Return to `vault-root-links.md`. Click link 2, `[[gnomon/question.yml#task.epistemic_aim|aim]]`. → The form of `gnomon/question.yml` opens at *epistemic aim*.
- [ ] In *Settings → Files and links*, turn *Use [[Wikilinks]]* on, and set *New link format* to *Shortest path when possible*. Delete every note created during this section, if any. → The settings hold their values of the setup.

## Upkeep of the index of identifiers

- [ ] Open `scenarios/twin-b.yml`, change its field *id* to `scenario.twin-b`, and press `Tab`. Open `scenarios/field-links.md` in the reading view, and click link 11. → The form of `scenarios/twin-a.yml` opens, since `scenario.twin` now designates one file.
- [ ] In the file explorer, rename `scenarios/twin-a.yml` to `twin-c.yml`. Open `field-links.md`, and click link 11. → The form of `scenarios/twin-c.yml` opens.
- [ ] In *Settings → Ekphrasis*, delete the path rule of `gnomon/question.yml`, then wait one second. Open `field-links.md`, and click link 9. → No file opens, and the notice names `quest.pendulum.sustained-oscillation` as declared by no record.
- [ ] In *Settings → Ekphrasis*, add the path rule again, with the pattern `gnomon/question.yml` and the schema `gnomon/schemas/question.schema.yaml`, then wait one second. Click link 9 again. → The form of `gnomon/question.yml` opens at *epistemic aim*.
- [ ] Open `scenarios/links.schema.yaml`: bound to no schema, it displays in the source view. Change its line `x-identifier: id` to `x-identifier: identity.id`, then open `scenarios/links.yml`. → A box of schema warnings displays. The box states that the keyword `x-identifier` names the field `identity.id`, and that the properties of the schema declare no such field.
- [ ] Open `scenarios/links.schema.yaml` again, restore its line `x-identifier: id`, then open `scenarios/links.yml`. → The form displays without the box of schema warnings.

## Every instruction at once

- [ ] Open `scenarios/guidance.yml`, and look at the header of the view. → Left of the two buttons folding the sections, a button shows the information icon.
- [ ] Click the information button. → The instructions of the title of the form and of every field carrying a help button show, the column *name* of the table *rows* included. The group *subject* stays folded, and its instructions show below its heading. The button displays as active.
- [ ] Click the help button of the field *title*. → Its instructions hide, and the others stay shown.
- [ ] Click the information button of the header. → Every instruction hides, and the group *subject* stays folded.
- [ ] Run *Ekphrasis: Show or hide all instructions* from the command palette. → Every instruction shows again.
- [ ] Run *Ekphrasis: Show or hide all instructions* again. → Every instruction hides.
- [ ] Run *Ekphrasis: Toggle form and source view*. → The source view displays, without the information button in the header.
- [ ] Run *Ekphrasis: Toggle form and source view* again. → The form displays, and the information button shows again.

## Reset

To restore the records, run `npm run test-vault` from the root of the repository: it copies the scenario records and the fixtures afresh into the test vault. The settings of Obsidian changed by this protocol, under *Files and links*, are restored by the last item of the section *Links written from the vault root*.

## Observations

### Run 1
