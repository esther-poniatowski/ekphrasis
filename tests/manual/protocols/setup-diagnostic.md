# Test protocol: Setup diagnostic

This checklist verifies inside Obsidian the command *Diagnose setup*, as the specification of the [setup diagnostic](../../../docs/features/setup-diagnostic.md) states:

- the command and the button of the settings, which open the report;
- the four groups of the report, with each status written as a word;
- the observed value, the capability affected and the next action of each check that does not pass;
- the technical details, folded and copyable, and the button *Copy report*;
- several failures displayed together;
- on a desktop computer, the run of a configured checker and its duration;
- on a phone or a tablet, the single check `unavailable` of the Python checkers.

The roadmap step of the setup diagnostic is ticked once these items pass. Each item states an action, then the expected result after the arrow. Tick an item when the result matches, and write any deviation under *Observations*, with the message of the developer console (`Cmd+Option+I`, tab *Console*) when the console shows a message.

> [!TIP] Rule for a failing item
> Record the deviation and continue with the next item. Stop only when the plugin fails to load, since every later item depends on it.

## Setup

The records of this protocol lie in the folder `scenarios/registry` of the test vault, as for the [protocol of the schema registry](schema-registry.md). Its registry maps `scenario:mismatch@1` to a schema declaring another contract, so one contract fails on purpose.

- [ ] Run `npm run build` and `npm run test-vault` from the root of the repository, then restart Obsidian, or disable and enable *Ekphrasis* in *Settings → Community plugins*. → No error notice appears, and the console holds no line starting with `ekphrasis:`.
- [ ] In the settings of Ekphrasis, enter `scenarios/registry/schemas.yml` under *Schema registry*. → The form of `scenarios/registry/bound.yml` opens.

## Report on a desktop computer

- [ ] Open `scenarios/registry/bound.yml`, open the command palette, and type `Diagnose`. → The command *Ekphrasis: Diagnose setup* is listed.
- [ ] Run the command. → A modal titled *Ekphrasis setup diagnostic* states that the checks run, then shows a summary line and the groups *Blocks schema-derived forms*, *Blocks saving authored records* and *Blocks configured custom checks*.
- [ ] Read the check *Schema of each registered contract*. → Its status reads *Fail*, it names `scenario:mismatch@1`, and it shows the lines *Affects:* and *Next action:*.
- [ ] Click *Technical details* below that check, select its text, and copy it with `Cmd+C`. → The details unfold, and the copied text holds the path of the schema.
- [ ] Read the checks of the group *Blocks saving authored records*. → Each reads *Pass*, and the last states that the operating system lets Obsidian write the record.
- [ ] Read the check *Registered custom checkers*. → It reads *Pass* and states that no custom checker is registered.
- [ ] Click *Copy report*, and paste into a new note. → A notice confirms the copy, and the note holds the plain text of the report, grouped under headings starting with `##`.

## Several failures

- [ ] In the settings, replace the registry by `scenarios/registry/absent.yml`. Add a custom checker named `tool`, with the module `ekphrasis_findings`, the function `findings_log`, the instance schemas `scenario:*` and the arguments `{"command": ["-m", "absent_tool", "check", "{folder}"]}`. Enter `/absent/bin/python` under *Python interpreter*. → The form of `bound.yml` reports that the registry is absent.
- [ ] Click *Diagnose setup* at the top of the settings. → The report opens with the check *Schema registry file* in *Fail*, naming the absent file, and the check *Python interpreter file* in *Fail*, naming `/absent/bin/python`.
- [ ] Read the checks that depend on the interpreter. → *Start of the Python interpreter*, *Modules imported by the checkers* and *Report of a measured checker run* read *Unavailable*, and each asks to repair the interpreter file first.
- [ ] Enter under *Python interpreter* the output of `python3 -c "import sys; print(sys.executable)"`, then click *Run again* in the report. → *Modules imported by the checkers* reads *Fail*, names `absent_tool`, and asks to install the missing package.
- [ ] Restore the registry `scenarios/registry/schemas.yml`, and remove the checker `tool` and the interpreter. → The form of `bound.yml` opens again.

## Configured checker of a project

This section runs on a vault of a project that publishes a checker command, such as a Gnomon checkout, configured as its own documentation states. Skip it when no such vault is available, and write *skipped* under *Observations*.

- [ ] Open a record of that vault whose schema the checker selects, and run *Diagnose setup*. → The check *Report of the checker* reads *Pass* and states the duration of the run and the number of results.
- [ ] Read the check *Duration of the checker*. → It states the measured duration and the timeout. When it reads *Warning*, its next action names a timeout of about twice the measured duration.

## Phone or tablet

- [ ] Open the test vault in the mobile app of Obsidian, open `scenarios/registry/bound.yml`, and run *Diagnose setup*. → The group *Blocks configured custom checks* holds one check, *Platform of Python checkers*, which reads *Unavailable* and states that forms and built-in checks remain available.
- [ ] Read the check *Write permission of the record*. → It reads *Unavailable*, not *Fail*.

## Observations
