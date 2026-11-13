# Test protocol: Local graph presentation

This protocol checks vault-local graph recipes. A matching override must change safe presentation properties without changing the generated graph or its producer-owned semantics.

## Setup

- [x] Build Ekphrasis, reload the plugin, and open a generated graph whose presentation profile identifier and version are known. → The graph renders from the producer profile before a local override exists.
- [x] Save the current bytes of `.obsidian/plugins/ekphrasis/data.json` and leave the generated graph unchanged. → Restoring the saved plugin data recovers the exact initial setting.

## Matching override

- [x] In *Graph presentation overrides*, enter one matching profile and version. Change a node-kind title and icon, an edge-kind title, and the compatible layouts. → The setting saves without a diagnostic.
- [x] Return to the open graph. → The changed title, marker fallback and edge caption appear; the node category and edge relation layer remain unchanged; the selector exposes only the admitted layouts.
- [x] Reload Obsidian with the graph open. → The saved override renders again.

## Rejected and unknown values

- [x] Misspell `nodeKinds`. → The editor identifies the rejected unit and retains the preceding valid setting.
- [x] Enter a valid-looking Lucide name that Obsidian does not know. → The node displays its marker fallback instead of an empty symbol.

## Restoration

- [x] Restore the saved plugin data and reload Obsidian. → The exact prior settings and producer presentation return.

## Observation

The protocol passed in Obsidian 1.15.1 on macOS on 2026-11-13. The live graph displayed *Local question*, the marker `?`, and the edge caption *locally addressed by*. Restricting the override to `layered-directed` removed the layout selector. Reloading Obsidian retained these values.

Restoring the saved plugin data restored *Question*, the producer icon, the caption *addressed by*, and both producer layouts. The generated graph file remained byte-for-byte unchanged. Automated tests cover the remaining boundaries: duplicate profiles, version mismatch, unknown recommended layouts, empty compatible-layout lists, producer-owned categories and producer-owned relation layers.
