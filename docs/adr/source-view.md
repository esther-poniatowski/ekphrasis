---
tags:
  - decision
index: "[Architecture decisions](docs/adr/_index.md)"
aliases:
  - Source view
status: accepted
---
# Source view

> [!QUESTION] Goal: which editor displays and modifies the YAML text of an instance?

The [requirement on source access](../requirements.md#^source-access) calls for the YAML text of an instance to remain editable within Obsidian. The instances are standalone YAML files, as the decision on [plain YAML instances](plain-yaml-instances.md) fixes, and ekphrasis registers their extensions for its own view.

## Decision

Ekphrasis supplies a source view: a CodeMirror 6 editor with a YAML language mode bundled with the plugin, hosted in the same view as the form, as the specification of the [form view](../features/form-view.md) details.

## Constraints

- **Source access**: the YAML text must be editable within Obsidian, with YAML syntax highlighting.
- **One view per extension**: the extensions `.yaml` and `.yml` open in the view of ekphrasis.
- **Maintenance**: the functions already provided by other editors should not be implemented again.

## Options weighed

| Option | Benefit | Cost |
| --- | --- | --- |
| Editor of ekphrasis, built on CodeMirror 6 with a bundled YAML language mode | The source view shares the view of the form, so one button switches between the two | The functions of the Obsidian editor, such as its Vim mode and its editor commands, must be rebuilt one by one |
| Editing delegated to YAML Editor | Completion and parse diagnostics already exist | YAML Editor opens the same extensions, so the two plugins must not both be enabled |
| Markdown editor of Obsidian, bound to the extensions | Every function of the Obsidian editor remains available | The extensions would open in the Markdown view instead of the form view |

## Consequences

- Obsidian supplies the core packages of CodeMirror 6 without a YAML language, so the YAML language mode is bundled with the plugin. Therefore, the bundler configuration must exclude the package of that language mode from the packages treated as external.
- Completion and diagnostics drawn from the schema remain open for subsequent work.

## Verification

The decision holds inside Obsidian, as a manual test in a test vault confirmed on 2026-10-02. The source view displayed the YAML text with line numbers and highlighting, and supported indentation and undo. One header button and one command switched it with the form view in the same tab. Each edit made in the source view was saved to the file.
