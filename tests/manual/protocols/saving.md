# Test protocol: Saving of scalars

This checklist verifies the milestone *Saving of scalars* inside Obsidian, before the milestone is declared complete. Each item states an action, then the expected result after the arrow. Tick an item when the result matches, and write any deviation under *Observations*, with the message of the developer console (`Cmd+Option+I`, tab *Console*) when one appears.

> [!TIP] Rule for a failing item
> Record the deviation and continue with the next item. Stop only when the plugin fails to load, since every later item depends on it.

## Setup

The record `scenarios/saving.yml` holds one field per kind of commit. The items change the record cumulatively, and each expected line depends only on the field of its item. The original text is restored by the section *Reset*.

- [x] Restart Obsidian, or disable and enable *Ekphrasis* in *Settings → Community plugins*. → No error notice appears, and the console holds no line starting with `ekphrasis:`.
- [x] Open *Settings → Ekphrasis*. → A slider *Commit delay* comes first, set to 1000, above the section *Path rules*.
- [x] Open `scenarios/saving.yml`. Open it a second time in a pane on the right, through *Split right* in the tab menu. Switch the right pane to the source view. → The left pane shows the form, in which only the field *copy* carries the question-mark badge of a locked value. The right pane shows the YAML text.

The right pane displays the text written by each commit of the left pane. Each item below states the line expected in the right pane.

## Edits of present values

- [x] Field *title*: replace the text by `edited title`, then press `Tab`. → `title: edited title # comment after a plain value`.
- [x] Field *title*: type `a: b`, then `Tab`. → `title: 'a: b' # comment after a plain value`.
- [x] Field *title*: type `42`, then `Tab`. → `title: '42' # comment after a plain value`.
- [x] Field *prose*: place the cursor after the period, press `Enter` twice, type `Second paragraph.`, then `Tab`. → `prose: | # restate the question`, followed by the two paragraphs indented by two spaces, with one blank line between them.
- [x] Field *formula*: replace the text by `\gamma`, then `Tab`. → `formula: '\gamma'`.
- [x] Field *count*: type `7`, then `Tab`. → `count: 7`.
- [x] Field *count*: type `open`, then `Tab`. → `count: open`, and the field keeps a text input.
- [x] Field *draft*: click the checkbox. → `draft: true` appears at once, without leaving the field.
- [x] Field *status*: choose *answered*. → `status: answered # posed | answered | open` appears at once.
- [x] Field *check → verdict*: choose *met*. → `check: { verdict: met, evidence: "" }`.
- [x] Field *tags → #1*: replace `alpha` by `edited`, then `Tab`. → `tags: [edited, beta]`.
- [x] Field *nominal*: replace `9.81` by `10`, then `Tab`. → `nominal: &g 10`, and the field *copy* now displays `10`.

## Empty and absent values

- [x] Field *note* (empty, after a comment): type `first line`, `Enter`, `second line`, then `Tab`. → `note: | # write the note here`, followed by the two lines indented by two spaces.
- [x] Field *summary* (absent): type `a summary`, then `Tab`. → A new line `summary: a summary` right after the line of *remark*.
- [x] Field *weight* (absent): type `1.5`, then `Tab`. → A new line `weight: 1.5` right after the line of *count*.
- [x] Field *subject → contrast → locus* (absent, in an absent group): type `other-outcome`, then `Tab`. → Under `system: pendulum`, the lines `  contrast:` and `    locus: other-outcome`.

## Cleared values

- [x] Field *remark* (optional): select its text, delete it, then `Tab`. → The line of *remark* is gone, and `# kept when the key is removed` stands alone on its line.
- [x] Field *count* (required): delete its text, then `Tab`. → `count: open`, the unfilled value of the schema.
- [x] Field *status* (required): choose the empty option. → `status: open # posed | answered | open`.
- [x] Open `scenarios/showcase.yml` in the left pane, clear the field *title* (required, and the schema declares no unfilled value), then `Tab`. → `title:` with an empty value after the colon. Reopen `scenarios/saving.yml` afterwards.

## Refused commits

- [x] Field *check → note* (absent, in a mapping between braces): type `x`, then `Tab`. → A red message appears below the field: *A key of a mapping written between braces cannot be added or removed from the form yet; edit it in the source view.* The right pane is unchanged, and the field still shows `x`.
- [x] Field *tags → #2*: delete its text, then `Tab`. → A red message: *An item cannot be removed from the form yet; remove it in the source view.* The right pane is unchanged.
- [x] Field *copy*: click into it and type. → The input accepts no text, and its badge explains that the value is written at its anchor.
- [x] Field *tags → #2*: type `beta` again, then `Tab`. → The red message disappears.

## Save timing

- [x] Field *title*: type a few letters, and keep typing with short pauses. → The right pane changes only once typing pauses for about one second.
- [/] Field *title*: type `abc` and wait one second without leaving the field. → The right pane shows `abc`; the cursor stays in the field, after the last letter. ==TODO: See observation 1.== ==🟠ANSWER: Defect, corrected. After each commit, the source pane on the right reloaded the file and focused its editor at each display. The source editor now takes the focus only when the author switches to the source view. Re-test in the section Second check.==
- [/] Field *weight*: type `1.50` and wait one second. → The right pane shows `weight: 1.5`, and the field still shows `1.50` while focused. Press `Tab`. → The field shows `1.5`. ==TODO: See observation 2.== ==🟠ANSWER: Defect, corrected. After the commit made during the pause, the field held no uncommitted text, so leaving it never rewrote the text. A field now displays its value as written when it loses the focus, provided its text reads as that value. Re-test in the section Second check.==
- [x] In the settings, set *Commit delay* to 5000, then type in *title* and wait two seconds. → The right pane is unchanged; it changes after five seconds of pause. Set the delay back to 1000.
- [x] Field *title*: type `before switch`, and click the header button *Open the source view* of the left pane at once. → The source view of the left pane shows `before switch`. Switch back to the form.
- [x] Field *title*: type `before close`, and close the left tab at once with `Cmd+W`. Reopen the file. → The field shows `before close`.
- [x] Field *title*: type `before leave`, and open another file in the left pane at once. Reopen `scenarios/saving.yml`. → The field shows `before leave`, and the other file shows no change.

## Changes from outside with a focused field

For this section, set *Commit delay* to 10000, so that no pause commits during an item.

- [/] Focus *title* in the left pane, and type `typed in the form` without leaving the field. In the right pane, change `posed` into `answered` on the line of *status*. Wait about two seconds, the delay after which the right pane saves. → The form shows *answered* in *status*, while *title* keeps `typed in the form`, the focus and the cursor position. ==TODO: See observation 3.== ==🟠ANSWER: Defect of the protocol. Clicking into the right pane removes the focus from the form, and losing the focus commits the field, as specified. The item must change the file while the focus stays in the form, as the item edited in TextEdit did. Revised item in the section Second check.==
- [x] Press `Tab` in the left pane. → The right pane shows both `title: typed in the form …` and `status: answered …`.
- [x] Focus *title* without typing. In the right pane, change the title text, and wait for the save. → The focused field shows the new title.
- [x] Focus *count*, and type `9` without leaving the field. In the right pane, change `draft: false` into `draft: [false`, with an unclosed bracket. Wait for the save. → The left pane keeps showing the form, under a red notice that gives the line and the column of the error.
- [/] Press `Tab` in the left pane. → The right pane still shows the old value of *count*. ==TODO: See observation 4.== ==🟠ANSWER: Defect of the protocol, as for observation 3: clicking into the right pane committed *count* before the text was broken. Revised items in the section Second check.==
- [/] In the right pane, restore `draft: false`, and wait for the save. → The notice disappears, and the right pane then shows `count: 9`. ==TODO: See observation 4.== ==🟠ANSWER: Same cause; see the answer to the previous item.==
- [x] Focus *title*, type `typed during an outside edit`, and edit the file in an editor outside Obsidian (for instance TextEdit), changing the line of *status*, then save there. → Same results as the first item of this section. Set *Commit delay* back to 1000. 

## Second check

The bundle was rebuilt with the two corrections. Restart Obsidian, or disable and enable *Ekphrasis*, before these items. Reset the record first.

- [x] With the two panes of the setup, replace the text of *title* in the left pane, then press `Tab`. → The focus moves to the field *prose* of the left pane, and the right pane shows the new line without taking the focus.
- [x] Click into the field *formula* of the left pane after an edit of *title*. → The focus stays in *formula*.
- [x] Field *weight*: type `1.50`, wait one second, then press `Tab`. → The field shows `1.5`, and the right pane shows `weight: 1.5`.
- [x] Field *weight*: type `2.50`, then press `Tab` at once. → The field shows `2.5`, and the right pane shows `weight: 2.5`.

For the next items, close the right pane, so that the form is the only view of the record in Obsidian. Set *Commit delay* to 10000, and open `scenarios/saving.yml` in TextEdit as well.

- [ ] Focus *title*, and type `typed in the form` without leaving the field. In TextEdit, change `posed` into `answered` on the line of *status*, and save. → The form shows *answered* in *status*, while *title* keeps `typed in the form`, the focus and the cursor position. Press `Tab`, then choose *File → Revert To → Last Saved* in TextEdit. → TextEdit shows both `title: typed in the form …` and `status: answered …`. ==TODO: See observation 5.== ==🟠ANSWER: Defect of the protocol. Switching to TextEdit removes the focus from Obsidian, so the field *title* commits its text; TextEdit then saves its older copy over that commit, after its warning. Zettlr succeeds because it reloads the file, but the field had already committed. The change from outside must reach the file while the focus stays in Obsidian, through a delayed command. Revised item in the section Third check.==
- [ ] Focus *count*, and type `9` without leaving the field. In TextEdit, change `draft: false` into `draft: [false`, and save. → The form stays displayed, under a red notice giving the line and the column of the error, and *count* keeps `9` with the focus. ==TODO: See observation 6.== ==🟠ANSWER: Defect, corrected. The YAML library detects an unclosed bracket only where the next line stops fitting, and reports that line. The error of an unclosed bracket or brace is now placed at that bracket: line of *draft*, column 8. Re-test in the section Third check.==
- [ ] Press `Tab` in the form. Revert TextEdit to the last saved version. → TextEdit still shows the old value of *count*.
- [ ] In TextEdit, restore `draft: false`, and save. → The notice disappears. Revert TextEdit to the last saved version: it shows `count: 9`. Set *Commit delay* back to 1000.

## Third check

The bundle was rebuilt with three further corrections: the position of an unclosed bracket, text selection in the form, and the focus restored when the author returns to the tab. Restart Obsidian, or disable and enable *Ekphrasis*, and reset the record. Close the right pane, and set *Commit delay* to 10000.

Each change from outside runs in Terminal through a delayed command, so the focus stays in Obsidian when the file changes. The commands run from the root of the repository. After starting a command, switch to Obsidian at once.

- [x] Run `sleep 10; sed -i '' 's/^status: posed/status: answered/' examples/test-vault/scenarios/saving.yml`. In Obsidian, focus *title*, and type `typed in the form` one letter every two seconds until *status* changes. → The form shows *answered* in *status*, while *title* keeps the typed text, the focus and the cursor position.
- [x] Press `Tab`, then run `grep -E '^(title|status):' examples/test-vault/scenarios/saving.yml`. → Both lines hold the new values.
- [x] Run `sleep 10; sed -i '' 's/^draft: false/draft: [false/' examples/test-vault/scenarios/saving.yml`. In Obsidian, focus *count*, and type `9` slowly until a notice appears. → The form stays displayed, under a red notice placing the error at the line of *draft*, column 8, with the caret under the bracket. The field *count* keeps `9` and the focus.
- [x] Press `Tab`, then run `grep '^count' examples/test-vault/scenarios/saving.yml`. → The old value of *count*.
- [x] Run `sed -i '' 's/^draft: \[false/draft: false/' examples/test-vault/scenarios/saving.yml`, then return to Obsidian. → The notice is gone. Run `grep '^count' examples/test-vault/scenarios/saving.yml`. → `count: 9`. Set *Commit delay* back to 1000.
- [x] Select with the mouse the label of a field, the schema path in the header, and the text of a red message, then copy and paste them into a note. → Each text is selected and pasted.
- [x] Focus *formula*, open another tab, then come back to the tab of the form by its header. → The focus is in *formula* again.
- [x] Focus *formula*, open another tab, then come back by clicking into *title*. → The focus is in *title*.

## Reset

To restore the record, open the source view of `scenarios/saving.yml` and replace its whole text by the original text:

```yaml
# yaml-language-server: $schema=saving.schema.yaml
# Manual test record of the milestone Saving of scalars.
title: plain title # comment after a plain value
prose: "One line of prose in double quotes." # restate the question
formula: '\alpha + \beta'
note: # write the note here
remark: optional remark # kept when the key is removed
count: 3
draft: false
status: posed # posed | answered | open
subject:
  system: pendulum
check: { verdict: pending, evidence: "" }
tags: [alpha, beta]
nominal: &g 9.81
copy: *g
```

## Observations

1. When I edit the render view on the left, the cursor often automatically switches to the source view on the right *as soon as I click anywhere else* or *as soon as I press Tab*. For instance, this occurs when I click into another field, or when I click on another tab view (even when it is not the source view).
2. Field *weight*: after typing `1.50`, the right pane indeed shows `weight: 1.5`, and the field still shows `1.50` while focused. However, after pressing `Tab` the field still shows `1.50`, not `1.5`.
3. When I move to the right panel to edit the source to "answer", the title automatically updates to the current content of the form's field. When come back to the left panel, "answered" is displayed in the form, but the cursor is absent from the "title" field, and the focus has disappeared too.
4. I could not fully complete these tests since the "count" field is updated as soon as I position the cursor in the source view.
5. The test succeeds only when I open TextEdit *after* having written the new title. Otherwise, if I change the title while TextEdit is open, then the new title is erased on saving, with the message `The document “saving.yml” could not be saved. The file has been changed by another application`. In contrast the test succeeds with the Zettlr application, that updates in sync with the form. However I do not know how to "revert back".
6. The error message reports an error at line 17, column 1 and shows a caret under "status", while the `[false` error is introduce the line above, in the "draft" field.

Other remarks:

1. No text in the form can be selected and copy-pasted. For instance, the names of the fields, the title, the schema, path, the error messages.
2. When I switch to another tab and I come back to the form, the focus disappears.