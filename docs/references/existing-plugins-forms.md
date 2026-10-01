---
tags:
  - assessment
index: "[References - Existing plugins](docs/references/_index.md)"
aliases:
  - Plugins for form management
---
# Assessment of existing plugins - Form management

Obsidian form plugins fall into three architectural paradigms. They differ mainly in where the form lives (a modal, the note body, or an external web page) and in how the form relates to the note's frontmatter (it creates it, keeps it in sync, or fills it in afterwards).

## 1. Modal form definition → note or value generation

These plugins treat a form as a declarative schema. Running a command opens a modal window, and submitting it either returns the collected values or produces a finished note.

**Modal Forms (danielo515)** is the most mature and widely used option in this category.

- **Invocation:** Forms can be opened from anywhere JavaScript can run, so they combine with plugins such as Templater or QuickAdd. Forms are defined in a simple JSON format and managed as a named collection, and a UI is provided for creating new ones.
- **Input types:** These include number, date, time, slider, toggle, free text, note-name autocompletion from a folder, autocompletion driven by a Dataview query, multiple choice, and select lists.
- **Conditional logic:** Recent releases added conditional fields, and a select field can serve as the condition for other fields.
- **Command registration:** Each form can be registered as a command, which makes QuickAdd unnecessary for simple cases while keeping it useful for advanced workflows.
- **Design rationale:** The native prompts in Templater and QuickAdd ask for one value at a time, offer no labels or descriptions, and do not allow fields to be skipped. Modal Forms fills exactly that gap. It is a composable building block, not a replacement for those plugins.
- **Maintenance:** The plugin has roughly 53k downloads, and its latest version was released recently.

**Note From Form (Sergei Kosivchenko)**

- **Template model:** Form and note templates are Markdown files that use Mustache syntax, and the form definition is a JSON object stored in the template's properties. After an index rebuild, each valid template appears as its own command in the palette.
- **Differentiator:** User-defined JavaScript functions can compute template data, and the note's name, folder and content can all depend on the inputs. Derived fields are therefore first-class.
- **Caveat:** adoption is low (a few hundred downloads).

**Oxill Forms**

- **Scope:** Forms are built once and filled in a modal to create notes, edit note properties, or insert text.
- **Naming and placement:** The note name and target folder accept form answers through double-brace placeholders.
- **Composability:** Each form is an ordinary Obsidian command, so Buttons, Meta Bind or Commander can trigger it, and DataviewJS can open it from code.
- **Caveat:** the plugin is very recent and has minimal adoption, so its maturity is unproven.

**Form Builder (p77-don)**

- **Approach:** Input forms are generated automatically from Markdown templates, and new notes are created from the submitted data. The schema is inferred from the template itself, so no separate form definition is needed.

## 2. Inline input fields bound to frontmatter

This paradigm has no submit step. Input controls sit inside the note and edit its properties continuously.

**Meta Bind (Moritz Jung)**

- **Binding model:** Input and view fields are bound to frontmatter properties and stay in sync with them. For example, the inline code block `INPUT[toggle:done]` switches a `done` property between true and false.
- **Buttons:** The plugin also provides buttons that trigger actions and is described as a spiritual successor to the discontinued Buttons plugin.
- **Adoption:** It has about 356k downloads and was updated within the past two weeks.
- **Known issue:** A reported bug describes existing frontmatter values losing their quote marks after an unrelated field is edited through Meta Bind.

**Metadata Menu (mdelobelle)**

- **Typed schema:** The plugin offers typed field definitions (input, boolean, number, select, and others), and preset values can be set globally or per file through fileClass definitions.
- **Role:** it is the closest analogue to a schema-enforced form over a class of notes. Its focus is governing metadata consistency across the vault, not capturing new entries.

## 3. External web forms synced into the vault

**Forms (Sorin Mircea)**

- **Mechanism:** Web forms are created, published, and linked to a vault folder, and submissions arrive as synced Markdown files.
- **Use case:** this is the only option here that collects input from third parties.
- **Caveat:** It is at version 1.0.18, was last updated about a year ago, and has around 800 downloads. It also depends on an external service, which matters for privacy and long-term availability.

## Selection criteria

|Requirement|Recommended plugin|
|---|---|
|Composable form primitive inside Templater, QuickAdd or DataviewJS pipelines|Modal Forms|
|Continuous, in-note editing of properties (dashboards, trackers)|Meta Bind|
|Schema enforcement over a class of notes|Metadata Menu|
|Computed or derived fields from arbitrary JavaScript at note creation|Note From Form|
|Collecting responses from external respondents|Forms (Sorin Mircea)|

The two leading options are complementary rather than competing, because they occupy different phases of a note's lifecycle:

- **Modal Forms** handles capture at creation time.
- **Meta Bind** handles mutation of properties after the note exists.

A common architecture is a Modal Forms command that instantiates a note, whose template then embeds Meta Bind fields for later edits.

## Coverage of the requirements of ekphrasis

The three plugins recommended for capture, continuous editing and schema enforcement cover the [requirements](../requirements.md) of ekphrasis to the extent below. The rows retain the requirements on which the documentation of these plugins bears:

| Requirement | Modal Forms | Meta Bind | Metadata Menu |
| --- | --- | --- | --- |
| File filled | a new note, or values returned to a script | frontmatter of the current note | frontmatter of the notes of a class |
| [Guided creation](../requirements.md#^guided-creation) | met: one command per form | not met: fields embedded in an existing note | not documented |
| [Typed controls](../requirements.md#^typed-controls) | partial: no Markdown, LaTeX or table input documented | partial: no Markdown, LaTeX or table input documented | partial: typed fields of the frontmatter |
| [Instructions on demand](../requirements.md#^instructions-on-demand) | partial: labels and descriptions in the modal | not documented | not documented |
| [Declared rules](../requirements.md#^declared-rules) | partial: conditional fields | not documented | partial: types and preset values |
| [Progressive saving](../requirements.md#^progressive-saving) | not met: submission step | met: continuous binding | not documented |
| [Source preservation](../requirements.md#^source-preservation) | not documented | not met: quotes reported lost after an unrelated edit | not documented |

## Consequences for ekphrasis

Two consequences for the design follow from the coverage:

- Every form plugin assessed here writes into notes or returns values to a script, whereas the records served by ekphrasis are standalone YAML files. Therefore, none of these plugins fills these records by itself, independently of its controls.
- Ekphrasis requires both phases covered separately by Modal Forms and Meta Bind: capture at creation, by the [requirement on guided creation](../requirements.md#^guided-creation), and continuous editing, by the [requirement on progressive saving](../requirements.md#^progressive-saving).

## Interface technology

The source repositories of the seven plugins show how each builds its interface. The table below records the interface technology and the validation library declared in the package manifest of each repository, as read on 2026-10-01:

| Plugin | Interface | Validation library | Evidence in the repository |
| --- | --- | --- | --- |
| Meta Bind | Svelte | Zod | 63 Svelte components; Svelte compiled through Vite |
| Modal Forms | Svelte | Valibot | 39 Svelte components; Svelte compiled through esbuild, with `svelte-check` |
| Metadata Menu | Plain DOM | none declared | No component framework; DOM helpers of Obsidian (`createEl`, `Setting`), and CodeMirror packages for its editors |
| Note From Form | Plain DOM | Ajv, draft 2020-12 | No component framework; a JSON Schema compiled by Ajv when the plugin loads |
| Oxill Forms | Plain DOM | none declared | No component framework and no runtime dependency |
| Form Builder | Plain DOM | none declared | No component framework and no runtime dependency |
| Forms (Sorin Mircea) | Plain DOM | none declared | No component framework; Supabase client for the external service |

^interface-technology

Four observations follow from the repositories:

- The two plugins with the largest documented adoption, Meta Bind and Modal Forms, build their interfaces with Svelte. The five others build them with the DOM helpers of Obsidian.
- No plugin examined uses Preact or React.
- Note From Form compiles a JSON Schema with Ajv at runtime. This use indicates that the code generation of Ajv runs inside Obsidian, as evidence from a third-party plugin only.
- Modal Forms embeds a renderer of Obsidian in a component: its Markdown block creates an Obsidian `Component`, renders into its own element, and unloads that `Component` when the Svelte component is destroyed.

## Sources

- [Modal Forms — GitHub](https://github.com/danielo515/obsidian-modal-form)
- [Modal Forms — Obsidian Community](https://community.obsidian.md/plugins/modalforms)
- [Modal Forms — Releases](https://github.com/danielo515/obsidian-modal-form/releases)
- [Modal Forms — ObsidianStats](https://dev.obsidianstats.com/plugins/modalforms)
- [Note From Form — Obsidian Community](https://community.obsidian.md/plugins/note-from-form)
- [Note From Form — ObsidianStats](https://www.obsidianstats.com/plugins/note-from-form)
- [Oxill Forms — Obsidian Community](https://community.obsidian.md/plugins/oxill-forms)
- [Form Builder — GitHub](https://github.com/p77-don/form-builder)
- [Forms — Obsidian Community](https://community.obsidian.md/plugins/forms)
- [Meta Bind — Obsidian Community](https://community.obsidian.md/plugins/obsidian-meta-bind-plugin)
- [Meta Bind Docs](https://www.moritzjung.dev/obsidian-meta-bind-plugin-docs)
- [Meta Bind — Issue #278](https://github.com/mProjectsCode/obsidian-meta-bind-plugin/issues/278)
- [#metadata tag — ObsidianStats](https://www.obsidianstats.com/tags/metadata)
- [Meta Bind — GitHub](https://github.com/mProjectsCode/obsidian-meta-bind-plugin)
- [Metadata Menu — GitHub](https://github.com/mdelobelle/metadatamenu)
- [Note From Form — GitHub](https://github.com/ArhiChief/obsidian-note-from-form)
- [Oxill Forms — GitHub](https://github.com/oxilldat/oxill-forms)
- [Forms — GitHub](https://github.com/sorinmircea/obsidian-forms-plugin)
- [Modal Forms — Markdown block component](https://github.com/danielo515/obsidian-modal-form/blob/master/src/views/components/Form/MarkdownBlock.svelte)
