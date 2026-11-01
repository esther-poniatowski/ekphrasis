# Test protocol: Undo in text controls

This checklist verifies inside Obsidian the undo and the redo of the edits of a control holding text, as the specification of [saving](../../../docs/features/saving.md) states:

- the texts typed between two pauses, undone one after the other and redone;
- a value on several lines, undone without losing or mixing characters;
- a paste whose line breaks become spaces, undone;
- the items *Undo* and *Redo* of the menu *Edit*;
- the editor of a Markdown value, and a change made outside.

The roadmap step on undo in a text control is ticked once these items pass. Each item states an action, then the expected result after the arrow. A pause lasts about two seconds, longer than the commit delay of one second, so the text typed before it is committed. Tick an item when the result matches, and write any deviation under *Observations*, with the message of the developer console (`Cmd+Option+I`, tab *Console*) when the console shows a message.

> [!TIP] Rule for a failing item
> Record the deviation and continue with the next item. Stop only when the plugin fails to load, since every later item depends on it.

## Setup

The record `scenarios/presentation.yml` is the record of the [protocol of form presentation](form-presentation.md).

- [ ] Run `npm run build` and `npm run test-vault` from the root of the repository, then restart Obsidian, or disable and enable *Ekphrasis* in *Settings → Community plugins*. → No error notice appears, and the console holds no line starting with `ekphrasis:`.

## Texts typed between pauses

- [ ] Open `scenarios/presentation.yml`. Click at the end of the value of *title*, type ` one`, pause, type ` two`, and pause. → The value reads *Onset of oscillation one two*.
- [ ] Press `Cmd+Z`. → The value reads *Onset of oscillation one*, and the cursor stays in the input.
- [ ] Press `Cmd+Z` again. → The value reads *Onset of oscillation*.
- [ ] Press `Cmd+Shift+Z` twice. → The value reads *Onset of oscillation one*, then *Onset of oscillation one two*.
- [ ] Type ` three` without a pause, and press `Cmd+Z` at once. → The value reads *Onset of oscillation one two*: the text typed since the last commit is dropped.
- [ ] Click the input of *code*, then click back at the end of *title*, and press `Cmd+Z`. → The value reads *Onset of oscillation one*.

## Value on several lines

- [ ] Click at the end of *Second remark.* in *remarks*, type `abc`, pause, and press `Cmd+Z`. → The input shows *First remark.* and *Second remark.* on two lines, with no letter of `abc` left.
- [ ] Repeat the previous item twice, typing `abc` at different speeds. → Each time, `Cmd+Z` removes the three letters together.
- [ ] Type `d`, press `Enter`, type `e`, pause, then press `Cmd+Z`. → The input shows the two lines of the start, *First remark.* and *Second remark.*

## Paste joining several lines

- [ ] Click the rendered value of *prose*, select its two lines in the editor that opens, and copy them with `Cmd+C`. Click at the end of the value of *title*, type a space, paste with `Cmd+V`, and pause. → The pasted text joins the value on the same line.
- [ ] Press `Cmd+Z`. → The pasted text and the space typed before it disappear, as they were committed together: the value reads as before the paste.

## Menu Edit

- [ ] Click at the end of *abstract*, type ` More.`, and pause. Open the menu *Edit* of Obsidian in the menu bar, and choose *Undo*. → The value no longer ends with *More.*
- [ ] Open the menu *Edit* again, and choose *Redo*. → The value ends with *More.* again.

## Editor of a Markdown value

- [ ] Click the rendered value of *prose*. At the end of its second line, type ` Added.`, pause, then press `Cmd+Z`. → The editor shows the two lines of the start, without *Added.*

## Change made outside

- [ ] Click at the end of *title*, type ` four`, and pause. Run *Ekphrasis: Toggle form and source view*, change the line of `title` to `title: Changed outside`, and run the command again to return to the form view. Click at the end of *title*, and press `Cmd+Z`. → The value stays *Changed outside*: the change made outside starts a new history.

## Source of the file

- [ ] Run *Ekphrasis: Toggle form and source view*. → The source shows `title: Changed outside`, `remarks: |` followed by its two remarks, and `prose: |` followed by its two lines, as the form displays them. Run the command again to return to the form view.

## Reset

To restore the records, run `npm run test-vault` from the root of the repository: it copies the scenario records and the fixtures afresh into the test vault.

## Observations

### Run 1
