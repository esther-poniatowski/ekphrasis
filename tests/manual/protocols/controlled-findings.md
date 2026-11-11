# Test protocol: Controlled findings

This protocol checks the position and the two routes of a controlled finding. The checker names the authored field that activates the issue. The validation summary presents that dependency before its ordinary issue counts and links to the controlling field and the repair target. The test changes only the disposable copy of the Gnomon question in the generated test vault.

## Setup

The setup runs the current Gnomon checker against an incomplete question in the disposable test vault.

- [x] Run the production build and prepare the test vault. Reload Obsidian without saving. → The updated plugin loads in the test vault.
- [x] In the plugin settings, select the interpreter of the Gnomon environment. Register the checker name `gnomon`, the module `ekphrasis_findings` and the function `findings_log` for the instance schema `gnomon/schemas/question.schema.yaml`. Give the registration the command arguments `["-m", "gnomon", "check", "{folder}", "--format", "sarif"]`. → The checker starts for `gnomon/question.yml`.
- [x] In the disposable test-vault copy of `gnomon/question.yml`, leave the field `task.requested_relation` empty while the field `task.epistemic_aim` holds `explanation`. Reload Obsidian without saving and wait for the checker. → Gnomon reports that the explanatory aim requires the requested relation.

## Read and follow the group

The summary must expose the dependency without removing the ordinary issue report.

- [x] Read the validation summary. → A group labelled *Controlled by task › epistemic aim* contains the finding at *task › requested relation* and its Gnomon message.
- [x] Read the summary from top to bottom. → The controlling-field group precedes the line for five missing fields, which precedes the line for sixteen invalid values.
- [x] Compare the group with the ordinary issue counts and the field issue. → The missing-field count and the issue at the requested relation remain present; independent findings remain in their ordinary places.
- [x] Select the controlling-field link. → The form moves to the field *epistemic aim* and focuses its control.
- [x] Return to the summary and select the repair-target link. → The form moves to the field *requested relation* and focuses its control.

## Observations

### Run 1 — 2026-11-10

Every item passed inside Obsidian 1.15.0 on macOS. Gnomon's Static Analysis Results Interchange Format property `gnomon/controllingDecision` supplied the group. Both links opened the expected field, and the complete validation report remained visible. The fixture contained no warning; the component regression supplies an intentionally scrambled warning and error to verify that warnings follow errors.
