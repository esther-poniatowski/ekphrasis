# Test protocol: Collections

This checklist verifies inside Obsidian the milestone *Collections*. The milestone gives each collection kind its controls, and each section a fold button and a vertical guide. The checklist also verifies two behaviours decided by the user on 2026-10-20. First, a new collection takes the flow form of its siblings. Second, a switch of alternative removes the keys of the previous alternative. The same checklist also verifies the changes of style requested by the [check of the corrections after *Validation*](corrections-validation.md). Both sets of roadmap steps are ticked once their items pass. Each item states an action, then the expected result after the arrow. Tick an item when the result matches, and write any deviation under *Observations*, with the message of the developer console (`Cmd+Option+I`, tab *Console*) when the console shows a message.

> [!TIP] Rule for a failing item
> Record the deviation and continue with the next item. Stop only when the plugin fails to load, since every later item depends on it.

## Setup

The record `scenarios/collections.yml` is bound to the schema `scenarios/collections.schema.yaml`. The record holds at least one field of each collection kind. Its table *rows* holds a value outside the admitted values. Its group *notes* is folded by the keyword `x-collapsed` when the form opens. The schema requires two properties without declaring them. Its field `nested.inner.level` admits the unfilled value `open`. The items change the record cumulatively, and the section *Reset* restores it.

- [ ] Run `npm run build` and `npm run test-vault` from the root of the repository, then restart Obsidian, or disable and enable *Ekphrasis* in *Settings → Community plugins*. → No error notice appears, and the console holds no line starting with `ekphrasis:`.
- [ ] Open `scenarios/collections.yml`. Open it a second time in a pane on the right, through *Split right* in the tab menu, and switch the right pane to the source view. → The left pane shows the form, and the right pane the YAML text.

## Boxes at the top of the form

The column of paths of each box takes at most half of the box. Therefore, the path `undeclared_property_with_a_long_name` must fit in half of a box, so the left pane must be wide. When a path is wider than half of the box, the path wraps, and the messages start at the middle of the box.

- [ ] Look at the box *Schema warnings*. → It lists `ghost`, `undeclared_property_with_a_long_name` and `nested.inner.level`, each followed by its message.
- [ ] Compare the start of the three messages. → The three messages start in one column, after the longest path, `undeclared_property_with_a_long_name`.
- [ ] Look at the red box below the box *Schema warnings*. → Its title reads `Validation: 2 missing fields, 1 invalid value`, without a final period, in red, the colour of its left edge.
- [ ] Compare the start of the two messages of the red box. → Both messages read *This required field is missing.*, and they start in one column, after `undeclared_property_with_a_long_name`.

## Collapsible sections

- [ ] Look at the table *rows*. → A vertical line runs on the left of its rows. The line starts under the chevron of its heading and ends at its last row.
- [ ] Look at the group *notes*. → Its chevron points right, and its field *text* is hidden.
- [ ] Click the chevron of *notes*. → The chevron points down, and the field *text* shows `folded at opening`.
- [ ] Click the chevron of *tags*. → The items of *tags* are hidden, and the heading keeps its label.
- [ ] Run *Ekphrasis: Collapse all* from the command palette (`Cmd+P`). → Every group and collection shows its heading only, with a chevron pointing right.
- [ ] Run *Ekphrasis: Expand all*. → Every group shows its fields and every collection its items, *notes* included.

## List

The field *tags* holds the flow sequence `[alpha, beta, gamma]`.

- [ ] Field *tags*: click *+ Add an item*. → An empty input labelled `#4` appears after `#3`, and the right pane is unchanged.
- [ ] Type `delta` in that input, then `Tab`. → The right pane shows `tags: [alpha, beta, gamma, delta]`.
- [ ] Item `#1`: click `↓`. → The right pane shows `tags: [beta, alpha, gamma, delta]`.
- [ ] Item `#3`: click `✕`. → The right pane shows `tags: [beta, alpha, delta]`.

The field *steps* holds a block sequence whose first item carries the comment `# on the first step`.

- [ ] Field *steps*, item `#1`: click `↓`. → The right pane shows `- second step` first, then `- first step # on the first step`.
- [ ] Item `#1`: delete its text, then `Tab`. → The input shows the placeholder `—`, and the right pane shows `- open` in place of `- second step`.
- [ ] Item `#2`: click `✕`. → The line `- first step` disappears, and the line `  # on the first step` remains below `- open`.

## Checkboxes

- [ ] Field *kinds*. → Three checkboxes *noun*, *verb* and *adjective*; *noun* and *adjective* are checked.
- [ ] Check *verb*. → The right pane shows `kinds: [noun, verb, adjective]`.
- [ ] Uncheck *noun*. → The right pane shows `kinds: [verb, adjective]`.

## Table

The field *rows* displays as a table with the columns *name*, *symbol* and *unit*. The cell *unit* of the row *time* holds `km`, outside the admitted values.

- [ ] Look at the table. → The header shows `name *`, *symbol* and *unit*. The cell *unit* of the row *time* shows `km (not admitted)`, with the message *The value must be one of: `m`, `s`, `kg`.* in red.
- [ ] Click *+ Add a row*. → An empty row appears at the end of the table, and the right pane is unchanged.
- [ ] Type `ma` in the cell *name* of the new row, and wait two seconds. Type `ss` without leaving the cell, and wait two seconds again. → After the pause, the right pane shows a new row `- name: ma`. The cell keeps the focus and the cursor, and after the second pause the right pane shows `- name: mass`.
- [ ] In the same row, choose `kg` in the cell *unit*. → The right pane shows `    unit: kg` under `- name: mass`.
- [ ] Row *mass*: click `↑`. → The row *mass* is the second row of the table, and the right pane shows its two lines between the rows *length* and *time*.
- [ ] Row *length*: click `✕`. → The row disappears, and its three lines disappear from the right pane.

## Keyed entries

The field *terms* displays as a table whose first column holds the identifier `b-term`.

- [ ] Below the table *terms*, type `b-term` in the input *Identifier of a new entry*. → The button *+ Add an entry* is disabled, and a message reads *The identifier b-term is already present.*
- [ ] Replace the text by `a-term`, then click *+ Add an entry*. → A row `a-term` with empty cells appears, and the right pane is unchanged.
- [ ] Type `A term` in its cell *label*, then `Tab`. → The right pane shows `  a-term:` followed by `    label: A term`, before `  b-term:`.
- [ ] Row `b-term`: click `✕`. → The entry `b-term` disappears from the table and from the right pane.

The field *entries* displays one collapsible group per identifier.

- [ ] Below the groups of *entries*, type `second` in the input *Identifier of a new entry*, then press `Enter`. → A group headed *second* appears, with its fields *label* and *frames*.
- [ ] In the group *second*, field *frames*: click *+ Add an item*, type `~ of y`, then `Tab`. → The right pane shows `  second:`, `    frames:` and `      - ~ of y`, below the entry `first`.

## Records

The field *variants* displays one collapsible group per item, headed `#1` and `#2`.

- [ ] Click *+ Add an item* below the groups. → A group `#3` appears, with its fields *name* and *aliases*.
- [ ] Type `medium` in its field *name*, then `Tab`. → The right pane shows `  - name: medium` after `  - name: large`.
- [ ] Group `#3`: click `↑` in its heading. → The group holding `medium` is second, and the right pane shows `  - name: medium` between the items *small* and *large*.
- [ ] Group `#2`, field *aliases*: add the item `m`. → The right pane shows `    aliases:` and `      - m` under `  - name: medium`.

The field *series* holds two items, each writing its key *marks* as a flow sequence.

- [ ] Field *series*: click *+ Add an item* below its groups, type `third` in the field *name* of the group `#3`, then `Tab`. → The right pane shows `  - name: third` after the item *second*.
- [ ] Group `#3` of *series*, field *marks*: add the item `c`. → The right pane shows `    marks: [c]` under `  - name: third`, in the flow form of the two other items.

## Alternatives

- [ ] Field *source*. → A selector *Alternative* shows *Book*, followed by the field *isbn* holding `978-0`.
- [ ] Choose *Paper* in the selector. → A dialog *Switch to Paper?* lists the field *isbn*, and the selector still shows *Book*.
- [ ] Click *Cancel*. → The dialog closes, the selector shows *Book*, the field *isbn* holds `978-0`, and the right pane is unchanged.
- [ ] Choose *Paper* again, then click *Remove and switch*. → The selector shows *Paper*, followed by an empty field *doi*, and the right pane shows `source: {}` in place of the lines of *source*.
- [ ] Choose *Paper* in the selector. → An empty field *doi* replaces the field *isbn*, and the right pane is unchanged.
- [ ] Type `10.1/x` in *doi*, then `Tab`. → The right pane shows `  doi: 10.1/x` above `  isbn: 978-0`, and the group *source* shows *The value matches several alternatives, whereas exactly one is admitted.*
- [ ] Look at the right pane and at the group *source*. → The right pane shows `source: {doi: 10.1/x}`, since the switch removed `isbn`, and the group shows no message about several alternatives.

The field *medium* holds the alternative *Print*, with the keys *pages* and *year*. The key *year* belongs to both alternatives.

- [ ] Field *medium*. → The selector shows *Print*, followed by the fields *pages* holding `340 pages` and *year* holding `2020`.
- [ ] Choose *Online* in the selector. → The dialog *Switch to Online?* lists the field *pages* only.
- [ ] Click *Remove and switch*. → The selector shows *Online*, followed by an empty field *url* and the field *year* holding `2020`. The right pane shows `medium:` followed by `  year: 2020` only.
- [ ] Type `example.org` in *url*, then `Tab`. Delete its text, then `Tab` again. → The right pane shows `  url: open` above `  year: 2020`.
- [ ] Choose *Print* in the selector. → No dialog opens, the line `  url: open` disappears from the right pane, and the selector shows *Print* with an empty field *pages*.

## Flow mapping

The field *check* holds `{verdict: pending}`.

- [ ] Field *check → evidence*: type `a test`, then `Tab`. → The right pane shows `check: {verdict: pending, evidence: a test}`.
- [ ] Field *check → verdict*: delete its text, then `Tab`. → The right pane shows `check: {evidence: a test}`.

## Consumer fixtures

- [ ] Open `gnomon/target-system.yml`. Table *variables*: add a row, type `forcing amplitude` in its cell *name*, then `Tab`. Run *Ekphrasis: Toggle form and source view*. → The source view shows `  - name: forcing amplitude` after the row *damping coefficient*.
- [ ] Return to the form view with the same command. Group `#3` of *variables*, field *signature*: add the item `t`, then run the command again. → The source view shows `    signature: [t]` under `  - name: forcing amplitude`, in the flow form of the signatures of the two other rows.
- [ ] Return to the form view with the same command. Field *reference class → selection criteria*: add the item `a periodic torque`, then run the command again. → The source view shows `  selection_criteria: [a periodic torque]`.
- [ ] Open *Settings → Ekphrasis*, click *Add a path rule*, and fill the pattern `**/{glossary,*.glossary}.yml` and the schema `geonexus/schemas/glossary.schema.yaml`. Open `geonexus/glossary.yml`. → The tab shows the form of the glossary, with the sections *terms* and *forbidden*.
- [ ] Below the groups of *terms*, add the identifier `phase-lag`, then type `phase lag` in its field *label*, then `Tab`. → The fields *gloss* and *category* of `phase-lag` are reported missing.
- [ ] Run *Ekphrasis: Toggle form and source view*. → The source view shows `  phase-lag:` and `    label: phase lag` after the entry `natural-frequency`.
- [ ] Return to the form view with the same command. Remove the glossary rule with its bin icon, since the [protocol of the bound form](bound-form.md) starts without that rule. → The tab of the glossary returns to the source view.

## Unbound file

- [ ] Open `scenarios/unbound.yml`, and run *Ekphrasis: Toggle form and source view*. → The form view shows the heading *This file is bound to no schema*.
- [ ] Read the sentence under the heading. → *To display it as a form, bind it to a schema by one of two methods:*
- [ ] Look at the first item of the list. → *write at the top of the file the line* `# yaml-language-server: $schema=path/to/schema.yaml`*;*, with the modeline after the words *at the top of the file*.

## Dropdown options

- [ ] Open `gnomon/question.yml`. Field *task → epistemic aim*: choose *Exploration*, then *Modal knowledge*, then `—`, opening the dropdown after each choice. → Each time, the dropdown lists `—` and the six aims, each once.

## Reset

To restore the records, run `npm run test-vault` from the root of the repository: it copies the scenario records and the fixtures afresh into the test vault.

## Observations
