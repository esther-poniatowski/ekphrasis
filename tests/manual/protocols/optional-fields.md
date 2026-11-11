# Test protocol: Optional fields

This checklist verifies the progressive disclosure of optional properties. The initial form must display every stated or currently required property. A choice must reveal the fields that it makes applicable, while every unrelated property remains available through *+ Add a field*. Follow each checklist item and compare the display with the stated result. Record mismatches under *Observations*.

## Setup

- [x] Run `npm run build` and `npm run test-vault` from the repository root. Restart Obsidian, or disable and enable *Ekphrasis* under *Settings → Community plugins*. → No error notice appears.
- [x] Open `scenarios/optional-fields.yml`. → The form titled *Optional fields* shows *Title* and the required group *Mandatory*, including its required field *Name*. The optional fields *Note* and *Details* do not appear. A selector labelled *+ Add a field* appears below the stated fields.

## Reveal and state one field

- [x] Open *+ Add a field*. → The selector offers *Note* and *Details* in schema order.
- [x] Choose *Note*. → The *Note* control appears and receives the focus. The selector now offers *Details* only.
- [x] Run *Ekphrasis: Toggle form and source view*. → The source still contains only the modeline, its comment and `title: Existing title`; no `note` key was written. Run the command again to return to the form.
- [x] Enter `A stated note` in *Note* and leave the control. Run *Ekphrasis: Toggle form and source view*. → The source now contains `note: A stated note`. Run the command again to return to the form.

## Reveal and discard a branch

- [x] Choose *Details* from *+ Add a field*. → The group *Details* appears. Its optional fields remain hidden, and its own selector offers *Summary* and *Source*.
- [x] Choose *Summary* inside *Details*. → The *Summary* control appears. The source remains unchanged until a value is entered.
- [x] Activate the *Discard Details* button. → The complete group disappears. After *Details* is chosen again, both *Summary* and *Source* remain hidden until the author selects either field.

## Follow an authored choice

- [x] Run `npm run test-vault`, then open `scenarios/validation.yml`. → The absent field *Tolerance* appears because *Aim* is *Prediction*. The field carries the required marker and its missing-field message, has no *Discard* button, and is absent from *+ Add a field*.
- [x] Change *Aim* to *Explanation*. → The uncommitted field *Tolerance* disappears.
- [x] Change *Aim* back to *Prediction*. Enter `0.1` in *Tolerance* and leave the control. → The source gains `tolerance: 0.1`.
- [x] Change *Aim* to *Description*. → *Tolerance* remains visible because it now holds an authored value. Its warning states that it must stay unfilled while the aim is description.

## Reset

Run `npm run test-vault` from the repository root to restore the scenario record.

## Observations

### Run 1 — 2026-11-10

All results matched in Obsidian 1.15.0 on macOS. The test vault was reset after the run.

### Run 2 — conditional disclosure — 2026-11-10

All four results matched in Obsidian 1.15.0 on macOS. The test vault was reset after the run.
