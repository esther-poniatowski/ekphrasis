# Test protocol: Guidance and navigation

This checklist verifies inside Obsidian the milestone *Guidance and navigation*. The milestone displays the instructions and the examples of each field on demand, renders the values of kind `markdown-line`, `markdown` and `latex` through the renderers of Obsidian, lists the issues at the top of the form with their fields, and adds the outline with its search. The checklist also verifies three behaviours decided by the user on 2026-10-20: the quoting style of siblings, empty values as unfilled values, and the source view kept per pane. The roadmap steps of the milestone that only Obsidian displays are ticked once their items pass. Each item states an action, then the expected result after the arrow. Tick an item when the result matches, and write any deviation under *Observations*, with the message of the developer console (`Cmd+Option+I`, tab *Console*) when the console shows a message.

> [!TIP] Rule for a failing item
> Record the deviation and continue with the next item. Stop only when the plugin fails to load, since every later item depends on it.

## Setup

The record `scenarios/guidance.yml` is bound to the schema `scenarios/guidance.schema.yaml` by its modeline. Its field *status* is empty and required, its field *count* holds `0` below the minimum `1`, and its field *summary* holds more than eight words, which raises a warning. Its field *copy* is an alias of *summary*. Its group *subject* is folded by the keyword `x-collapsed` when the form opens. The record `scenarios/guidance-long.yml` holds 120 entries, each with one Markdown value and one formula. The items change the records cumulatively, and the section *Reset* restores them.

- [x] Run `npm run build` and `npm run test-vault` from the root of the repository, then restart Obsidian, or disable and enable *Ekphrasis* in *Settings → Community plugins*. → No error notice appears, and the console holds no line starting with `ekphrasis:`.
- [x] Open `scenarios/guidance.yml`. Open it a second time in a pane on the right, through *Split right* in the tab menu, and switch the right pane to the source view. → The left pane shows the form, and the right pane the YAML text.

## Instructions on demand

- [x] Look at the label of the field *title*. → An information icon follows the label *title*.
- [x] Field *title*: click the information icon. → Below the label, a panel reads *The name of the record, in one line.*, with *one* in bold, followed by *Examples* and the values `Onset of oscillation` and `Decay to rest`.
- [x] Field *title*: click the information icon again. → The panel disappears.
- [x] Look at the labels of the fields *summary* and *copy*. → *summary* carries an information icon, and *copy* carries a circled question mark only, since its value is locked and it has no instructions.
- [x] Group *subject*, still folded: click the information icon of its heading. → The panel *What the record is about.* displays below the heading, and the group stays folded.
- [x] Table *rows*: click the information icon in the header of the column *name*. → Above the table, a panel titled *name* reads *Name of the variable, in words.*
- [x] Look at the title *Guidance* at the top of the form, and click its information icon. → The panel reads the description of the schema, starting with *A schema exercising the instructions on demand*.
- [x] Field *empty line*: look at its input. → The input is empty, with the placeholder `— A *new* line`.

## Rendered values

- [x] Look at the field *summary*. → The value displays on one line, with *emphasis* in italics and *linked-note* as a link, without the characters `*` and `[[`.
- [x] Field *summary*: click the link *linked-note*. → The note *Linked note* opens. Return to `scenarios/guidance.yml` with the back arrow of the tab.
- [x] Field *summary*: click the text *A line with*, outside the link. → An input replaces the rendered value, holding `A line with *emphasis* and a link to [[linked-note]] here`, with the cursor in it.
- [x] In that input, replace `here` by `there`, then press `Tab`. → The right pane shows `summary: &line A line with *emphasis* and a link to [[linked-note]] there`, and the field *summary* displays rendered again.
- [x] Look at the field *copy*. → It displays the same rendered line, ending with *there*.
- [x] Field *copy*: click its rendered value. → No input opens.
- [x] Look at the field *prose*. → A paragraph with **bold** text, followed by a callout titled *A callout* holding *Its body.*
- [x] Field *prose*: click the first paragraph. → A multi-line input holds the text of the value, the callout lines included.
- [x] Press `Tab` without typing. → The field *prose* displays rendered again, and the right pane is unchanged.
- [x] Look at the field *formula*. → A display formula shows a fraction *a* over *b*, plus *α*.
- [x] Field *formula*: click the formula. → An input holds `\frac{a}{b} + \alpha`.
- [x] Press `Tab`. Field *summary*: click its rendered value, then press `Tab` twice. → The first `Tab` focuses the help button of *prose*, and the second opens the multi-line input of *prose*, since the help button of each field lies in the order of `Tab`, as the user decided on 2026-10-22.
- [x] Table *rows*, row *angle*, cell *expression*: look at the cell. → The cell displays the formula *θ*.

## Rendering of a long record

- [x] Open the console, and clear it with its icon. Open `scenarios/guidance-long.yml` in the left pane. → The first entries display their prose rendered and their formulas within a second, and the console holds no line starting with `ekphrasis: a batch`.
- [x] Scroll at once to the end of the form. → The last entries display rendered within a few seconds, and scrolling stays fluid.
- [x] Write in *Observations* each console line starting with `ekphrasis: a batch`, if any, with its duration. → The console holds no such line.
- [x] Group *entries → #60*, field *name*: type `entry sixty` while the form still renders, then press `Tab`. → The characters display as typed, without a visible delay.
- [x] Return to `scenarios/guidance.yml` in the left pane. → The form displays rendered values again.

## Summary at the top of the form

- [x] Look at the red box below the binding line. → Its title reads *Validation*. Three lines follow: `1 missing field` followed by `status`, `1 invalid value` followed by `count`, and `1 warning` followed by `summary`.
- [x] In the line `1 invalid value`, click `count`. → The form scrolls to the field *count*, its input takes the focus, and the field is outlined briefly in the accent colour.

## Outline

- [x] Run *Ekphrasis: Show outline* from the command palette (`Cmd+P`). → The right sidebar shows the panel *Form outline*, listing *title*, *status*, *count*, *summary*, *prose*, *formula*, *empty line*, *copy*, *subject*, *rows* and *steps*.
- [x] Look at the entries of the outline. → *subject* holds *system* and *note*, *rows* holds *angle* and *damping*, each holding *name*, *symbol* and *expression*, and *steps* holds *first* and *second*.
- [x] Look at the marks of the entries. → *status* carries a dot in the accent colour, *count* a red dot, and *summary* an orange dot.
- [x] Outline, entry *subject → system*: click it. → In the form, the group *subject* unfolds, the input of *system* takes the focus, and the field is outlined briefly.
- [x] In the form, click the input of the field *title*. → In the outline, the entry *title* is highlighted.
- [x] Outline, entry *rows*: click its triangle. → The entries *angle* and *damping* disappear from the outline, and the table *rows* of the form is unchanged.
- [x] Outline: check *Only entries with issues*. → The outline lists *status*, *count* and *summary* only.
- [x] In the form, select `posed` in the dropdown of the field *status*. → The outline lists *count* and *summary* only, and the right pane shows `status: posed`.
- [x] Outline: uncheck *Only entries with issues*. Open `gnomon/question.yml` in the left pane. → The outline lists the entries of the question, from *title* to *maturity*.
- [x] Switch the right pane, which holds `scenarios/guidance.yml` in the source view, to the form view, and click inside it. → The outline lists the entries of the guidance record.
- [x] Switch the right pane back to the source view, then click the outline entry *formula*. → The right pane opens the form view, scrolled to the field *formula*.

## Search

- [x] Run *Ekphrasis: Search the fields*. → The outline shows, with the focus in its field *Search the fields*.
- [x] Type `name`. → The outline lists the results *name* under `rows › angle`, `rows › damping`, `steps › first` and `steps › second`.
- [x] Search result *name* under `rows › damping`: click it. → The form scrolls to the cell *name* of the row *damping*, whose input takes the focus, and the panel *name* with *Name of the variable, in words.* shows above the table.
- [x] Click in the left pane, which holds `gnomon/question.yml`. In the search field of the outline, replace the text by `epistemic_aim`, then press `Enter`. → The left pane scrolls to the field *task → epistemic aim*.
- [x] Clear the search field. → The outline lists the entries again.

## Decided steps

The table *rows* writes its names in double quotes.

- [x] Click in the right pane, which holds `scenarios/guidance.yml`. Table *rows*: click *+ Add a row*, type `pressure` in the cell *name* of the new row, then press `Tab`. Run *Ekphrasis: Toggle form and source view*. → The source view shows `  - name: "pressure"` after the row *damping*, in the double quotes of the other names.
- [x] Keep the right pane in the source view. Click `scenarios/saving.yml` in the file explorer. → The right pane shows the YAML text of `scenarios/saving.yml`, in the source view.
- [x] Click `scenarios/corrections.yml` in the file explorer. → The right pane stays in the source view, and shows `status:`, `summary:`, `done:` and `count:` with empty values.
- [x] Run *Ekphrasis: Toggle form and source view*. → The form of `scenarios/corrections.yml` shows the fields *status*, *summary* and *count* empty with the mark `—`, and the toggle *done* turned off and followed by `—`.
- [x] Click `scenarios/guidance.yml` in the file explorer. → The right pane shows the form of the guidance record.

## Consumer fixtures

The question fixture of gnomon carries instructions and examples restating the comments of the question template of gnomon.

- [x] Open `gnomon/question.yml`. Click the information icon beside the title *Question*. → The panel reads the description of the record, starting with *A question record fixes the question before any candidate answer is evaluated.*
- [x] Group *subject → domain*: click the information icon of its heading. → The panel reads *Restrictions of the a priori specification only. The assumptions of the analysis belong to the answer.*
- [x] Group *virtues → #1*, field *standing*: look below the dropdown. → The line *The appraisal ranks the answers on the virtue.* describes the value *preferred*.

## Reset

To restore the records, run `npm run test-vault` from the root of the repository: it copies the scenario records and the fixtures afresh into the test vault.

## Observations

Behavior: 

- "Press `Tab`. Field *summary*: click its rendered value, then press `Tab` twice. → The first `Tab` opens the multi-line input of *prose*, and the second opens the input of *formula*." The first Tab focuses on the input circle of the next field `prose`, and the second Tab opens the multi-line input of *prose*.
- In the outline, add a button/symbol to clear the search field with a cross.
- In the form view and the outline, add a button to fold all fields.

Style:

- The information circle of the title is too close to the last letter.
- For formulas, it should be possible to configure in the schema whether it is centered in the cell or aligned.
