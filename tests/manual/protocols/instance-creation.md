# Test protocol: Instance creation

This checklist tests the command *Create instance* inside Obsidian. The command must create a record from a writable registry contract and open its form. Follow each checklist item and compare the resulting state with the text after the arrow. Tick a matching result. Record a mismatch under *Observations*.

## Setup

- [x] Run `npm run build` and `npm run test-vault` from the repository root. Restart Obsidian, or disable and enable *Ekphrasis* under *Settings → Community plugins*. → No error notice appears.
- [x] Under *Settings → Ekphrasis*, set *Schema registry* to `scenarios/registry/creation-schemas.yml`. Open `scenarios/registry/bound.yml`. → The form titled *Registered record* displays.
- [x] Confirm that the file `scenarios/registry/created.yml` does not exist. If a prior protocol run created it, delete that file before continuing. → The target path is absent.

## Create a record

- [x] Run *Ekphrasis: Create instance*. → A schema chooser opens and includes *Registered record — scenario:registered@1*.
- [x] Choose *Registered record — scenario:registered@1*. → A path prompt opens with a path ending in `new-registered.yml` under `scenarios/registry`.
- [x] Replace the proposed path with `scenarios/registry/created.yml`, then activate *Create*. → The new file opens as the form titled *Registered record*. The form shows no `_schema` field.
- [x] Run *Ekphrasis: Toggle form and source view*. → The source contains `_schema: scenario:registered@1`, `id: null`, and `name: null`. The source has exactly these three keys.

## Refuse an overwrite

- [x] Run *Ekphrasis: Create instance* and choose *Registered record — scenario:registered@1*. → The path prompt opens.
- [x] Enter `scenarios/registry/created.yml` and activate *Create*. → A notice states that the file already exists. The existing source remains unchanged.

## Invalid registry

- [x] Under *Settings → Ekphrasis*, set *Schema registry* to `scenarios/registry/missing.yml`. Run *Ekphrasis: Create instance*. → A notice states that the registry is absent, and no schema chooser opens.

## Reset

Run `npm run test-vault` from the repository root to restore the scenario records and the empty *Schema registry* setting.

## Observations

### Run 1 — 2026-11-10

Every item passed inside Obsidian 1.15.0 on macOS. The chooser listed the writable contract, the proposed path used the active folder, and the created form hid `_schema`. The source contained exactly the three expected keys. The existing path was refused without changing the source. The absent registry produced the expected notice without opening the chooser. The reset removed the created file and restored the empty registry setting.
