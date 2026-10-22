# Test protocol: Corrections after the check of Guidance and navigation

This checklist verifies inside Obsidian the five corrections drawn from the check of the milestone *Guidance and navigation*:

- the spacing of the icon of the title;
- the keys opening the instructions of a focused help button;
- the keyword `x-align` of formulas;
- the buttons folding every section;
- the cross clearing the search of the outline.

After these corrections, the checklist runs the spikes of the milestone *Links*. Their verdicts settle the premises left open by the declarations of the API of Obsidian. The roadmap steps of the corrections are ticked once their items pass. Each item states an action, then the expected result after the arrow. Tick an item when the result matches, and write any deviation under *Observations*, with the message of the developer console (`Cmd+Option+I`, tab *Console*) when the console shows a message.

> [!TIP] Rule for a failing item
> Record the deviation and continue with the next item. Stop only when the plugin fails to load, since every later item depends on it.

## Setup

The record `scenarios/corrections-guidance.yml` is bound to the schema `scenarios/corrections-guidance.schema.yaml` by its modeline. The form is titled *Corrections*. The root schema carries instructions, so the title carries a help button. The field *note* carries instructions, and the field *name* before it carries none. Four fields hold the formula *a* over *b*, and differ by their keyword `x-align`:

- *centred* declares no alignment;
- *left* declares `x-align: left`;
- *explicit* declares `x-align: center`;
- *wrong* declares `x-align: right`, a value outside the two admitted ones.

In the table *rows*, the column *left* declares `x-align: left`, and the column *centred* declares no alignment.

- [ ] Run `npm run build`, `npm run build:spikes` and `npm run test-vault` from the root of the repository, then restart Obsidian, or disable and enable *Ekphrasis* in *Settings → Community plugins*. → No error notice appears, and the console holds no line starting with `ekphrasis:`.
- [ ] Open `scenarios/corrections-guidance.yml`. → The form titled *Corrections* displays, without a box of issues.

## Title of the form

- [ ] Look at the title *Corrections* at the top of the form. → The information icon is separated from the final *s* by a gap of about the width of a letter.

## Keys of the help button

- [ ] Field *name*: click its input, then press `Tab`. → The information icon of the field *note* takes the focus, and no panel of instructions shows yet.
- [ ] Press `Enter`. → Below the label *note*, the panel *A note on the record, in one line.* shows, and stays shown.
- [ ] Press `Enter` again. → The panel disappears.
- [ ] Press `Space`. → The panel shows again, and the form does not scroll.
- [ ] Press `Space` again. → The panel disappears.
- [ ] Hold `Enter` down for one second, then release it. → The panel shows once and stays shown, without flickering.
- [ ] Press `Tab`. → The input of the field *note* takes the focus, and the panel stays shown.

## Alignment of formulas

- [ ] Look at the fields *centred* and *explicit*. → Each displays the fraction *a* over *b*, centred in its content area.
- [ ] Look at the field *left*. → The fraction starts at the left edge of its content area.
- [ ] Look at the field *wrong*. → The fraction is centred, as in the field *centred*. The top of the form holds no box of schema warnings.
- [ ] Table *rows*, row *angle*: look at the cells *left* and *centred*. → The formula *θ* starts at the left edge of the cell *left*, and is centred in the cell *centred*.
- [ ] Table *rows*, row *damping*: look at the cells *left* and *centred*. → The formula *γ* starts at the left edge of the cell *left*, and is centred in the cell *centred*.
- [ ] Field *left*: click the formula, then press `Tab` without typing. → An input holding `\frac{a}{b}` opens, then the formula renders again, starting at the left edge.

## Folding every section

- [ ] Look at the header of the view, left of the button opening the source view. → Two more buttons display: chevrons pointing toward each other, then chevrons pointing away from each other.
- [ ] Click the first of the two buttons, with the chevrons pointing toward each other. → The group *subject* and the table *rows* fold, and the fields *name* to *wrong* stay displayed.
- [ ] Click the second button, with the chevrons pointing away from each other. → The group *subject* unfolds, with the list *parts* unfolded inside it, and the table *rows* unfolds.
- [ ] Run *Ekphrasis: Toggle form and source view*. → The source view displays, and the header shows the button opening the form view, without the two buttons of folding.
- [ ] Run *Ekphrasis: Toggle form and source view* again. → The form displays, and the two buttons of folding show again in the header.
- [ ] Run *Ekphrasis: Show outline* from the command palette (`Cmd+P`). Look at the top of the panel *Form outline*. → Two buttons with the same chevrons display above the search field. The search field shows a magnifier at its start.
- [ ] Outline: click the first button, with the chevrons pointing toward each other. → The outline lists *name*, *note*, *centred*, *left*, *explicit*, *wrong*, *subject* and *rows*, without their entries, and the form keeps the group *subject* and the table *rows* unfolded.
- [ ] Outline, entry *rows*: click its triangle. → The entries *angle* and *damping* display under *rows*, each folded.
- [ ] Outline: click the second button, with the chevrons pointing away from each other. → Every entry displays, down to *subject → parts → rod* and *bob*, and *rows → angle → name*, *left* and *centred*.

## Clear button of the search

- [ ] Outline: click the search field. → No cross shows in the empty search field.
- [ ] Type `name`. → The outline lists the results *name* under `rows › angle` and `rows › damping`, and a circled cross shows at the end of the search field.
- [ ] Click the cross. → The search field empties, the cross disappears, the outline lists the entries again, and the cursor stays in the search field.
- [ ] Type `sys` without clicking the search field. → The outline lists the result *system* under `subject`.
- [ ] Click the cross. → The outline lists the entries again.

## Spikes of the milestone Links

Through the disposable plugin *Ekphrasis spikes*, these items test the premises of the milestone *Links* left open by the declarations of the API. That plugin registers its view for the extensions `.yaml` and `.yml` in place of ekphrasis, so ekphrasis must stay disabled during this section. The note `scenarios/links.md` holds nine numbered links: links 1 to 3 are wikilinks, links 4 to 7 are Markdown links, and links 8 and 9 are URIs of Obsidian handled by the spike. Link 3 designates the field *name* of the second row of the table *rows*, *damping*, by the position `rows[1]`. The result of each item is recorded: a result that differs from the expected one is a verdict, written under *Observations*. Such a result is not a defect to correct.

- [ ] Clear the console. In *Settings → Community plugins*, disable *Ekphrasis*, then enable *Ekphrasis spikes*. → A notice and the console line `ekphrasis-spike: [subpath] registered .yaml and .yml` appear.
- [ ] Open `scenarios/links.md` in the reading view. Click link 1, `[[guidance.yml#subject.system]]`. → The record `scenarios/guidance.yml` opens, with the line *Opened by the view of ekphrasis-spikes*, and the console holds a line `[subpath] setEphemeralState` whose state holds `#subject.system`. Copy that line under *Observations*.
- [ ] Return to the note with the back arrow of the tab. Click links 2 to 7 in turn, returning to the note after each. → Links 2 to 6 open `scenarios/guidance.yml`, and link 7 opens `gnomon/question.yml`. For each link, write under *Observations* the file opened, or the note created, and the state of its line `[subpath] setEphemeralState`.
- [ ] Delete every note created by a click on links 2 to 7, if any. Switch `scenarios/links.md` to the live preview, and click link 1 there. → The same line `[subpath] setEphemeralState` as in the reading view appears in the console.
- [ ] Return to `scenarios/links.md`. Run *Ekphrasis spikes: Resolve the links of the active note*, then *Ekphrasis spikes: Copy the report*, and paste the report under *Observations*. → Each line `[resolution]` of links 1 to 7 names its destination, or `unresolved`, and the lines `resolvedLinks` and `unresolvedLinks` list the files counted by Obsidian.
- [ ] In the live preview of `scenarios/links.md`, type `[[guidance.yml#` on a new line at the end of the note. → A list of suggestions shows `ekphrasis-spike: title`, `ekphrasis-spike: task.epistemic_aim` and `ekphrasis-spike: rows[0].name`, and the console holds a line `[suggest] triggered`. Write under *Observations* whether the suggestions of headings of Obsidian show instead, or as well.
- [ ] Select `ekphrasis-spike: task.epistemic_aim` with the arrow keys and `Enter`. → The line reads `[[guidance.yml#task.epistemic_aim`, followed by `]]` when Obsidian closed the brackets.
- [ ] On a new line, type `[system](guidance.yml#`. → The suggestions `ekphrasis-spike: …` show. Write under *Observations* whether they show.
- [ ] On a new line, type `[[guidance#`, without the extension. → Write under *Observations* which suggestions show, if any. Then delete the three lines typed.
- [ ] Switch `scenarios/links.md` to the reading view, and click link 8, the URI without the parameter `vault`. → A notice `[protocol] handler received` shows the action `ekphrasis-spike`, the identifier `quest.pendulum.sustained-oscillation` and the field `task.epistemic_aim`, in the vault `test-vault`, and no other window or application opens.
- [ ] Click link 9, the URI with the parameter `vault`. → The same notice shows, with the key `vault` among the parameters.
- [ ] Switch `scenarios/links.md` to the live preview, and click link 8 there. → The same notice as in the reading view shows.
- [ ] Run *Ekphrasis spikes: Copy the report*, and paste the report under *Observations*. In *Settings → Community plugins*, disable *Ekphrasis spikes*, then enable *Ekphrasis*. Open `scenarios/guidance.yml`. → The form of the guidance record displays.

## Reset

To restore the records, run `npm run test-vault` from the root of the repository: it copies the scenario records and the fixtures afresh into the test vault.

## Observations

