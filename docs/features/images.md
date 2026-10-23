---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Images
---
# Images

A form displays the images of its record, such as SVG and PNG files of the vault, as the [requirement on images](../requirements.md#^images) demands. An image reaches the form in one of two ways.

## Images embedded in values

A value of kind `markdown-line` or `markdown` can embed an image, as a note does, by an embed such as `![[diagram.svg]]` or `![diagram](figures/diagram.png)`. The value renders through the Markdown renderer of Obsidian, as the [form view](form-view.md) specifies, with the instance as the source of its links. Therefore, the image is expected to display inside the rendered value, resolved as in a note located at the instance. The first step of the milestone *Images* verifies this display for SVG and PNG files.

## Fields holding an image

A field can hold an image: its value designates an image file of the vault, and the form displays that image in place of the text of the value. A control next to the image chooses another file. The name of the kind of such a field, the form of its value, and the formats admitted remain open, as the [roadmap](../../TODO.md) records.
