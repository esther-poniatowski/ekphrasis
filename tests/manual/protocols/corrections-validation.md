# Test protocol: Corrections after the check of Validation

This checklist verifies inside Obsidian the corrections made after the check of the milestone *Validation*, before their roadmap steps are ticked. Each item states an action, then the expected result after the arrow. Tick an item when the result matches, and write any deviation under *Observations*, with the message of the developer console (`Cmd+Option+I`, tab *Console*) when the console shows a message.

> [!TIP] Rule for a failing item
> Record the deviation and continue with the next item. Stop only when the plugin fails to load, since every later item depends on it.

## Setup

The record `scenarios/corrections.yml` is bound to the schema `scenarios/corrections.schema.yaml`. The record holds unfilled values in four fields of different kinds, and a title written as a block scalar. Two fields forbidden by its aim are absent. The items change the record cumulatively, and the section *Reset* restores it.

- [x] Run `npm run build` and `npm run test-vault` from the root of the repository, then restart Obsidian, or disable and enable *Ekphrasis* in *Settings → Community plugins*. → No error notice appears, and the console holds no line starting with `ekphrasis:`.
- [x] Open `scenarios/corrections.yml`. Open it a second time in a pane on the right, through *Split right* in the tab menu, and switch the right pane to the source view. → The left pane shows the form, and the right pane the YAML text.

## Schema defects

- [x] Look at the top of the form. → A box *Schema warnings* lists three entries, in the order of the three items below.
- [x] Entry `ghost`. → *The property `ghost` is required by the keyword `required`, but absent from the properties of its group, so the form displays no field for it.*
- [x] Entry `explanans`. → The same message, naming *the keyword `then`*.
- [x] Entry `level`. → *The value `open` is declared unfilled by the keyword `x-unfilled`, but also admitted by this field, so the form displays it as an empty value.*
- [x] Look at the red box below it. → It reads *Validation: 2 missing fields.*, and lists `ghost` with *This required field is missing.*

## Unfilled values

Each field below holds `open` in the file, the unfilled value of the schema.

- [x] Field *status*. → The dropdown shows `—`, and the field shows *This required field is missing.*
- [x] Open the dropdown of *status*. → It lists `—`, `posed` and `answered`, each once, and no option `open`.
- [x] Field *summary*. → An empty input, whose grey placeholder reads `— One sentence stating the result.`
- [x] Field *done*. → A toggle turned off, followed by `—`.
- [x] Field *count*. → An empty input, whose placeholder reads `—`.
- [x] Field *status*: choose *posed*, then choose `—`. → The right pane shows `status: posed`, then `status: open`, and the dropdown shows `—` again.
- [x] Field *count*: type `3`, then `Tab`. → The right pane shows `count: 3`.
- [x] Field *done*: click the toggle. → The right pane shows `done: true`, and the mark `—` disappears.

## Conditional rules

The schema forbids the fields *tolerance* and *bounds* while the field *aim* holds `description`, its value at opening.

- [x] Field *tolerance* (absent). → The field is greyed, typed characters do not appear in its input, and a note below it reads *This field stays unfilled while `aim` equals `description`.*
- [x] Group *bounds* (absent). → Its heading and its fields *lower* and *upper* are greyed, the note appears once, under the heading, and neither field accepts typing.
- [x] Field *aim*: choose *prediction*. → *tolerance* and *bounds* are no longer greyed, and their notes disappear. The label *tolerance* carries the required marker `*`, and the field shows *This field is required when `aim` equals `prediction`.*
- [x] Field *tolerance*: type `0.1`, then `Tab`. → The right pane shows `tolerance: 0.1`, the message disappears, and the marker `*` stays.
- [x] Field *aim*: choose *description*. → *tolerance* keeps `0.1`, is not greyed and still accepts typing, and shows *This field must stay unfilled when `aim` equals `description`.*, in orange. The marker `*` disappears.
- [x] Field *tolerance*: delete its text, then `Tab`. → The line `tolerance: 0.1` disappears from the right pane, and the field is greyed and disabled, with its note.
- [x] Field *aim*: choose *explanation*. → The red box lists `explanans` with *This required field is missing.*, and the box *Schema warnings* still names `explanans`.

## Single-line values

- [x] Field *title*. → The field shows `A title written as a block scalar`, and the right pane shows `title: |-` followed by that text on the next line.
- [x] Field *title*: replace the text by `One title`, then `Tab`. → The right pane shows `title: One title`, on one line.
- [x] Field *title*: replace the text by `a: b`, then `Tab`. → The right pane shows `title: 'a: b'`.

## Unbound file

- [x] Open `scenarios/unbound.yml`, and run *Ekphrasis: Toggle form and source view* from the command palette (`Cmd+P`). → The form view shows the heading *This file is bound to no schema*.
- [x] Read the sentence under the heading. → *To display it as a form, bind it to a schema in one of two ways:*
- [x] Look at the list under that sentence. → Two items aligned on the left: the line `# yaml-language-server: $schema=path/to/schema.yaml`, and a path rule in the settings.

## Dropdown options of gnomon

The duplicated options observed during the check of *Validation* did not reappear outside Obsidian. Therefore, these items also collect evidence of a duplication inside Obsidian.

- [x] Close every pane but one, and open `gnomon/question.yml` in it. → The field *subject → contrast → foil status* and the field *task → requested relation* show `—`, since both hold `open`.
- [x] Field *task → epistemic aim*: choose *Exploration*, then *Modal knowledge*, then *Prediction*, then `—`, then *Exploration*, opening the dropdown after each choice. → Each time, the dropdown lists `—` and the six aims, each once.
- [x] If an aim appears twice, run in the console `[...document.querySelectorAll('[data-path="task.epistemic_aim"] option')].map((option) => option.textContent)`. → Record the printed list under *Observations*, with the sequence of choices that produced the duplication.

## Reset

To restore the records, run `npm run test-vault` from the root of the repository: it copies the scenario records and the fixtures afresh into the test vault.

## Observations

Major remarks:

- The source YAML and the checker `x-unfilled` still use the keyword open. It seems a fragile strategy. Why cannot they use the dedicated symbol instead? This would simplify the association and free "open" as an admitted potential value. 
- Regarding the duplication of the fields, the previous observation was incorrect. The user has not read correctly, and confounded "modal" with "model" and "exploration" with "explanation". No issue existed in the first validation.

Minor style improvements:

- Regarding the formulation of the validation box, although the fields are correctly detailed in a list, the title of the bow still reads a sentence. For example: `Validation: 3 missing fields, 9 invalid values and 1 warning.` I propose to drop "and" and the trailing period to make it more operational.
- The title of the validation box appears with a black font, while the title of the schema warning has the accent of the left edge of the box (orange). Use red for the validation box.
- In both boxes, align the beginning of the messages after the longer field name.
- In `unbound`, the term "ways" must be replaced. The line must come after "at the top of the file".
