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

A field of kind `image` holds an image. Its value is the path of an image file, written from the folder of the instance, as the path of a modeline is, such as `figures/diagram.svg`. The form displays that image in place of the text of the value, and a control next to the image chooses another file of the vault. The formats admitted are those that Obsidian displays natively: SVG, PNG, JPEG, GIF and WebP.

A path written from the folder of the instance stays valid when the folder of a project moves to another vault, and a custom checker reads it outside Obsidian. Obsidian rewrites the links of a renamed file in notes only, so the value of a field is not rewritten when its image is renamed.

Two sources set the width of a displayed image, the second overriding the first:

- the keyword `x-image-width` of the field sets the width of each of its images, in pixels or as a percentage of the width of the field, such as `320px` or `50%`. Without it, an image takes the width of the field, and never exceeds its own width;
- a value written as a mapping holding the keys `path` and `width` sets the width of its own image, in the same units. A value written as a plain path takes the width of the field.

```yaml
figure: figures/diagram.svg
detail:
  path: figures/detail.png
  width: 320px
```

The schema of a field of kind `image` admits both forms of the value, so that JSON Schema validates the width and a custom checker reads the path and the width directly.
