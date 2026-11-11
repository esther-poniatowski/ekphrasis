# Test protocol: Generated-view freshness

This protocol checks whether Obsidian distinguishes a current generated view from a stale one. A configured producer command calculates the source-state token. Ekphrasis displays whether the stored and current tokens match.

## Setup

Prepare the current plugin bundle, one generated view and its freshness checker.

- [x] Build Ekphrasis, prepare the test vault and run *Reload app without saving*. → Obsidian loads the current plugin bundle.
- [x] Generate the current Gnomon views in a temporary directory. Copy one view, its current schema and the current schema registry into the test vault. → Ekphrasis resolves the view's logical contract.
- [x] Register `ekphrasis_commands.source_state` for `gnomon:view.*`. Set `command` to `["-m", "gnomon", "source-state", "."]`, `root` to the Gnomon example and `pointer` to `/source_state`. → The checker starts with no configuration issue.

## Current source records

Confirm that the generated view agrees with the unchanged source records.

- [x] Open the generated view. → A neutral *Validation context* block displays *Source state: current*.
- [x] Inspect the validation summary and the `source_state` field. → Neither reports a freshness issue.

## Changed source records

Change only a disposable copy of the source records. Then, compare its token with the token stored in the generated view.

- [x] Copy the complete Gnomon example into a disposable directory and change one authored value in that copy. → `gnomon source-state` prints a token different from the token stored in the generated view.
- [x] Point the checker's `root` to the changed copy and reload the plugin. → The validation summary counts one `warning` and links it to *Source state*.
- [x] Read the issue under the field. → The stale-state message instructs the researcher to regenerate the file before trusting the generated view.

## Restoration

Restore every test-vault file changed by the protocol and remove its disposable inputs.

- [x] Restore `data.json` and the schema registry from the bytes saved before the protocol. Remove the temporary view and schema. → The test vault matches its pre-protocol state.
- [x] Delete the disposable source copy after recording the results. → No altered research record remains.

## Observation — 2026-11-11

The generated `next-act` view showed both expected states in Obsidian 1.15.0 on macOS. The unchanged example displayed *Source state: current*. After a title changed in the disposable copy, the form warned at *Source state*. The issue told the researcher to regenerate the view from current source records.

The first attempt used a test-vault window that had loaded the preceding plugin bundle. That bundle reported that `ekphrasis_commands` was absent. Running *Reload app without saving* loaded the fresh bundle and removed the error.
