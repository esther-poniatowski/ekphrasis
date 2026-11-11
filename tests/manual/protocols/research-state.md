# Test protocol: Research state

This protocol verifies that a schema-declared unresolved value remains valid authored content. The form presents the value apart from validation defects and routes its summary to the field that holds it. A current Gnomon assessment supplies the contract and the record; Ekphrasis supplies no Gnomon-specific value or path.

## Setup

- [x] Run the production build and prepare the test vault. Materialize Gnomon's current schema registry, assessment contract and assessment base schema in the vault at the relative paths published by the registry. → The registry resolves `gnomon:assessment@2` without a schema warning.
- [x] Copy a current Gnomon assessment that holds one verdict `pending` into the disposable test vault. Set the Ekphrasis schema-registry setting to the materialized registry, then reload Obsidian without saving. → The assessment opens as a form through its logical contract.

## Distinguish and follow the state

- [x] Read the summaries above the form. → A box titled *Research state* reports one unresolved state. No box titled *Validation* is created for that verdict.
- [x] Read the pending verdict field. → Its value remains `pending`, and its field message states that the field records an epistemically unresolved state.
- [x] Select the field link in *Research state*. → The form moves to *Tests › admissibility › Admissible-explanans › Verdict* and focuses its dropdown.

## Observations

### Run 1 — 2026-11-10

Every item passed inside Obsidian 1.15.0 on macOS. The real Gnomon assessment held one pending admissibility verdict. Ekphrasis displayed one unresolved state under *Research state*, displayed no validation summary for that value, and focused the exact pending verdict from the summary link.
