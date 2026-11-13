# Test protocol: Setup diagnostic

This checklist verifies inside Obsidian the command *Diagnose setup*, as the specification of the [setup diagnostic](../../../docs/features/setup-diagnostic.md) states:

- the command and the button of the settings, which open the report;
- the four groups of the report, with each status written as a word;
- the observed value, the capability affected and the next action of each check that does not pass;
- the technical details, folded and copyable, and the button *Copy report*;
- several failures displayed together;
- on a desktop computer, the run of a configured checker and its duration;
- on a phone or a tablet, the single check `unavailable` of the Python checkers, when mobile verification resumes.

The current roadmap step covers the researcher-facing desktop report. Mobile verification is deferred and does not block that step. The separate console check supplies maintainer evidence and does not block the usability result. Each item states an action, then the expected result after the arrow. Tick an item when the result matches, and write any deviation under *Observations*.

> [!TIP] Rule for a failing item
> Record the deviation and continue with the next item. Stop only when the plugin fails to load, since every later item depends on it.

## Setup

The records of this protocol lie in the folder `scenarios/registry` of the test vault, as for the [protocol of the schema registry](schema-registry.md). Its registry maps `scenario:mismatch@1` to a schema declaring another contract, so one contract fails on purpose.

- [x] Run `npm run build` and `npm run test-vault` from the root of the repository, then restart Obsidian, or disable and enable *Ekphrasis* in *Settings → Community plugins*. → No error notice appears.
- [ ] Open the developer console (`Cmd+Option+I`, tab *Console*). → No line starts with `ekphrasis:`.
- [x] In the settings of Ekphrasis, enter `scenarios/registry/schemas.yml` under *Schema registry*. → The form of `scenarios/registry/bound.yml` opens.

## Report on a desktop computer

- [x] Open `scenarios/registry/bound.yml`. Invoke *Open command palette*, then enter `Diagnose`. → The command *Ekphrasis: Diagnose setup* is listed.
- [x] Run the command. → A modal titled *Ekphrasis setup diagnostic* states that the checks run, then shows a summary line and all four capability groups.
- [x] Read the check *Schema of each registered contract*. → Its status reads *Fail*, it names `scenario:mismatch@1`, and it shows the lines *Affects:* and *Next action:*.
- [x] Click *Technical details* below that check, then use *Copy report*. → The details unfold, and the copied report holds the path of the schema.
- [x] Read the checks of the group *Blocks saving authored records*. → Each reads *Pass*, and the last states that the operating system lets Obsidian write the record.
- [x] Read the check *Registered custom checkers*. → It reads *Pass* and states that no custom checker is registered.
- [x] Click *Copy report*, and paste into a new note. → A notice confirms the copy. The note holds the plain text of the report under headings starting with `##`.

## Several failures

- [x] In the settings, replace the registry by an absent path. Add a custom checker named `tool`, with the module `ekphrasis_findings`, the function `findings_log`, the instance schemas of the project and the arguments `{"command": ["-m", "absent_tool", "check", "{folder}"]}`. Enter `/absent/bin/python` under *Python interpreter*. → The opened form reports that the registry is absent.
- [x] Click *Diagnose setup* at the top of the settings. → The report opens with the check *Schema registry file* in *Fail*, naming the absent file, and the check *Python interpreter file* in *Fail*, naming `/absent/bin/python`.
- [x] Read the checks that depend on the interpreter. → *Start of the Python interpreter*, *Modules imported by the checkers* and *Report of a measured checker run* read *Unavailable*, and each asks to repair the interpreter file first.
- [x] Restore the project interpreter, then click *Run again* in the report. → *Modules imported by the checkers* reads *Fail*, names `absent_tool`, and asks to install the missing package.
- [x] Restore the registry and the original checker settings. → The opened form resolves again.

## Configured checker of a project

This section runs on a vault of a project that publishes a checker command, such as a Gnomon checkout, configured as its own documentation states. Skip it when no such vault is available, and write *skipped* under *Observations*.

- [x] Open a record of that vault whose schema the checker selects, and run *Diagnose setup*. → The check *Report of the checker* reads *Pass* and states the duration of the run and the number of results.
- [x] Read the check *Duration of the checker*. → It states the measured duration and the timeout. When it reads *Warning*, its next action names a timeout of about twice the measured duration.

## Runtime of project commands

- [x] In a Gnomon vault with no custom checker configured, configure a primary-view command and a post-creation command. Replace the interpreter by `/absent/bin/python`, then run *Diagnose setup*. → *Python interpreter file* reads *Fail*. The report states that primary views and post-creation actions are affected, names the interpreter setting as the next action, and keeps editing available.
- [x] Restore the project interpreter and run the diagnostic again. → *Python interpreter file* and *Start of the Python interpreter* read *Pass*.

## Deferred: phone or tablet

Mobile verification is outside the current basic-version milestone. These checks remain as the acceptance route for a later platform pass.

- [ ] Open the test vault in the mobile app of Obsidian, open `scenarios/registry/bound.yml`, and run *Diagnose setup*. → The group *Blocks configured custom checks* holds one check, *Platform of Python checkers*, which reads *Unavailable* and states that forms and built-in checks remain available.
- [ ] Read the check *Write permission of the record*. → It reads *Unavailable*, not *Fail*.

## Observations

- 2026-11-11, Obsidian 1.15.0 on macOS: the basic desktop report route passed.
- The build and test-vault commands passed before the run. The console inspection remains supplementary maintainer evidence.
- Technical details unfolded and appeared in the copied report, as the feature specification requires.
- 2026-11-13, Obsidian 1.15.1 on macOS: the combined-failure route reported the absent registry and interpreter independently. Restoring the interpreter advanced the report to the missing `absent_tool` package.
- A configured Gnomon checker produced a valid SARIF report with 0 results in 6.1 seconds. The duration warning compared that run with the 10-second timeout and recommended 12.3 seconds.
- The original Gnomon vault settings were restored byte-for-byte after the run.
- Mobile verification is deferred outside the current basic-version milestone.
- The project-command runtime failed and recovered as specified in a Gnomon vault with no custom checker configured.
