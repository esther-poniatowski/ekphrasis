# Test protocol: Validation context

This presentation protocol verifies that a configured project checker can state the target and the bounded meaning of its current run without creating an issue. A clean external Gnomon run supplies both contexts; it does not check the synthetic record opened in the test vault. Automated component tests separately cover context returned with an empty issue list.

## Setup

- [x] Run `npm run build` and `npm run test-vault` from the Ekphrasis repository root. Restart Obsidian, or run *Reload app without saving*. → The plugin loads successfully.
- [x] Run `<gnomon-python> -m gnomon check <gnomon-example> --scope question-typed --format sarif`, using an absolute example-folder path. → The log holds one run, zero results and the run property `gnomon/validationScope` with a *Completion target* followed by a *Clean result*.
- [x] In the generated test-vault settings, set `pythonInterpreter` to `<gnomon-python>`. Register `ekphrasis_findings.findings_log` with `schemas` equal to `["gnomon/schemas/question.schema.yaml"]`. Set `command` to the command from the preceding step, `root` to `<gnomon-example>` and `context_property` to `gnomon/validationScope`. Reload Obsidian. → `gnomon/question.yml` begins loading through the checker without a configuration warning.

## Read the target and findings

- [x] Open `gnomon/question.yml`. → A block labelled *Completion target* appears after the schema path and states `question-typed`.
- [x] Read the rest of that block. → It states that Gnomon checks completeness through this scope, identifies the result as a computed inquiry diagnosis and names the validation-scope documentation target.
- [x] Read the block labelled *Clean result*. → It states *structural and method conformance only* and says that the check establishes no truth, warrant or acceptance for the research claims.
- [x] Compare the block with the box *Validation*. → The completion target is neutral and separate. The validation box counts only current findings.
- [x] Inspect the root report after the checker returns. → No checker-start error appears, and the form displays its controls.

## Observations

### Run 1 — 2026-11-10

Every item passed inside Obsidian 1.15.0 on macOS. The displayed target came from a real Gnomon Static Analysis Results Interchange Format run at `question-typed`. Separately, the validation box reported one missing field. The first run exposed a bundle defect: Electron tried to fetch `node:child_process` as a dynamic module. The corrected build lowered lazy dynamic imports to lazy CommonJS loads. Therefore, the repeated protocol passed without the root error.

### Run 2 — 2026-11-10

The clean-result extension passed inside Obsidian 1.15.0 on macOS. A real Gnomon run returned zero results and two ordered context objects. The form displayed *Completion target* followed by *Clean result*, including the statements *structural and method conformance only* and *The check establishes no truth, warrant or acceptance for the research claims.* The validation box separately reported one missing field from the synthetic record, so the context neither suppressed nor counted that issue.
