# Test protocol: Primary generated view

This protocol verifies two outcomes. First, an explicit completion target must reach the configured producer. Second, Ekphrasis must open the file selected by that producer.

## Setup

- [x] Build Ekphrasis, prepare the test vault and run *Reload app without saving*. → Obsidian loads the current plugin bundle.
- [x] Save the current bytes of `.obsidian/plugins/ekphrasis/data.json`. Copy a complete Gnomon inquiry into the disposable folder `gnomon-inquiry` of the vault. Copy its current view schemas and registry to the exact vault paths recorded by the registry. → The producer can read the inquiry; restoring the saved file recovers the original configuration exactly.
- [x] Set *Python interpreter* to the Gnomon environment. Set *Primary-view command* to `["-m", "gnomon", "views", "{vault}/gnomon-inquiry", "--scope", "{target}", "--output", "{vault}/views", "--result", "json"]`. → The command names the disposable inquiry, while Gnomon retains the target-to-view mapping.

## Selected view

- [x] Run *Open primary view*, enter `candidate-proposed`, and select *Generate and open*. → The generated `views/exposure.yml` opens in the Ekphrasis form view.
- [x] Inspect the generated file and its form. → The file declares its view schema and the form displays its coverage and exposure data from that file.
- [x] Run the command again with `question-typed`. → The generated `views/next-act.yml` opens instead, without a change to the Ekphrasis settings.

## Refused result

- [x] Temporarily set *Primary-view command* to `["-c", "import json; print(json.dumps({'path': '../outside.yml'}))"]`. Run *Open primary view*. → Ekphrasis reports that the path lies outside the vault and keeps the current file open.

## Restoration

- [x] Reset the test vault, restore the settings from the bytes saved before the protocol, and remove the disposable inquiry and generated views. → The versioned fixtures and exact prior settings are restored.

## Observation

The protocol passed in Obsidian 1.15.0 on macOS on 2026-11-11. The first run exposed two opening defects. A newly generated file had to enter Obsidian's indexed file model before it could open. Replacing an active Ekphrasis view through `setViewState` could then leave a blank leaf. The command now waits for the indexed `TFile` and opens that file through the workspace leaf. Both selected views opened in sequence, and the refused outside-vault result left `next-act.yml` open.
