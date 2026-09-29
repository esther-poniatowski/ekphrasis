---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - YAML notes
---
# YAML notes

A YAML note holds the YAML data of a project inside the vault, so that Obsidian indexes the links written in its values. Obsidian indexes links for notes only, so a file with the plain extension `.yaml` has none of its links indexed. Therefore, a YAML note is a Markdown file whose name ends with the suffix `.yaml.md` and whose body holds one YAML document. The final suffix `.md` makes Obsidian treat the file as a note, so YAML notes satisfy the [requirement on vault indexing](../requirements.md#^vault-indexing). The inner suffix `.yaml` identifies the note to ekphrasis.

## Structure

A YAML note separates its metadata from its data: an optional frontmatter block holds the metadata, and the body that follows holds the data. The note below declares its view specification in the frontmatter and two keys in its body:

```markdown
---
tags:
  - specification
view: "[[views/model.view.yaml]]"
---
model:
  name: Variational autoencoder
  summary: |
    Latent-variable model trained by maximizing the evidence lower bound.
```

Obsidian displays the frontmatter in the Properties panel, as for any note, whereas ekphrasis renders the body only. A body without frontmatter must not open with the delimiter line `---`, since Obsidian reads an opening line `---` as the start of a frontmatter block.

## Data for a YAML parser

The data of a YAML note must stay readable by a standard YAML parser without preprocessing, as the [requirement on machine readability](../requirements.md#^machine-readability) demands. The frontmatter keeps the data readable, because its closing delimiter `---` also marks the start of a document in the YAML syntax. Therefore, a standard YAML parser reads a YAML note with frontmatter as a stream of two documents: the metadata, then the data. To consume only the data, a program selects the last document of the stream. This selection rule also holds for a YAML note without frontmatter, whose stream holds the data only.

## Indexing by Obsidian

Obsidian parses the body as Markdown to build its index, so a link written in a value is indexed as a link of the note. One limitation follows from this parsing: the Markdown syntax reads some YAML lines as code, and Obsidian does not index the links inside code. Specifically, a line indented by four spaces or more after a blank line opens an indented code block in Markdown. With the common indentation of two spaces per level, the lines of a block scalar reach four spaces as soon as its key is nested below the root. A link on such a line after a blank line is still found by the text search. However, the link is absent from the backlinks and from the graph. ^indexing-limitation

> [!WARNING] Applicability
> The indexing behaviour follows the CommonMark rule for indented code blocks. A test vault must confirm this behaviour for the current version of Obsidian.
