# Roadmap

The roadmap of ekphrasis lists the steps that implement each [feature](docs/features/_index.md), with the state of each step. Each completed step carries the date of its check. Within each section, a step follows the steps that it relies on.

## YAML notes

- [ ] Open in the reading mode every note whose name ends with the suffix `.yaml.md`, and retire the setting that registers the extensions `.yaml` and `.yml`.
- [ ] Separate the frontmatter from the body before parsing, and offset the line numbers of parse errors accordingly.
- [ ] Confirm in a test vault that a wikilink such as `[[model.yaml]]` resolves to the note `model.yaml.md`.
- [ ] Confirm in a test vault which links of the body are indexed by Obsidian, and correct the [indexing limitation](docs/features/file-format.md#^indexing-limitation) if the test contradicts the stated limitation.

## Key references and links

- [ ] Parse key paths, including value segments and quoted keys, and match them against the tree.
- [ ] When a link with a key path opens a YAML note, scroll to the designated key, including a row of a table.
- [ ] Suggest the key paths of a YAML note after a hash sign in a link.
- [ ] Provide the command *Rename key* to rewrite the references to the renamed key across the vault.
- [ ] Provide the command *Report broken key references*.
- [ ] When a link is followed in the reading mode, open its target.

## Presentation

- [x] Render the default presentation of mappings, scalars and sequences of scalars (2026-09-28).
- [ ] Parse view specification notes, match path patterns, and apply the first matching rule.
- [ ] Select the view specification from the frontmatter link, then from the folder rules of the settings.
- [ ] Render records as a correspondence table, and render keyed records and pairs as a table when a view specification declares the strategy `table`.
- [ ] Fold sections by nesting the containers of blocks.
- [ ] Render first the blocks that enter the visible area of a long YAML note.

## Embedding

- [x] Render the YAML note named by the option `src` of a code block `yaml-view` (2026-09-28).
- [ ] Restrict the embedding to the key designated by the option `path`.

## Editing

- [ ] Switch a YAML note between the reading mode and the Markdown editor in source mode, by a header button and a command.
- [ ] Bundle a YAML language mode, exclude it from the external packages of the bundler, and register the highlighting extension for YAML notes.
- [ ] Show each parse error above the rendered view of the last version that parsed.

## Examples and tooling

- [ ] Convert the example vault to YAML notes, and replace its schema file by a view specification note.
- [ ] Publish releases through a workflow that attaches the plugin bundle, the manifest and the style sheet.
