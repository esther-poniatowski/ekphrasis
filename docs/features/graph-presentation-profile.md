---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Graph presentation profile
---
# Graph presentation profile

A producer of a generated graph embeds once a presentation profile, which states how Ekphrasis draws its categories, its kinds of node and its kinds of edge. Ekphrasis owns the recipes of the rendering, so it publishes the profile as the JSON Schema [graph-presentation.schema.json](../../specs/schemas/graph-presentation.schema.json), under the absolute `$id` `https://github.com/esther-poniatowski/ekphrasis/specs/schemas/graph-presentation.schema.json`. A producer refers to that schema by its `$id`, and receives it through the registry of Ekphrasis, which lists it as a resource.

A profile holds:

- `profile` and `version`, which name it and to which a vault binds its local overrides;
- `layouts`: the layout applied first, and the layouts that the graph admits;
- `categories`: each category with its `title`, `shape`, `marker` and `style`;
- `node_kinds`: each kind of node with its `category`, `title`, `icon`, `marker` and `style`;
- `edge_kinds`: each kind of edge with its `title`, `layer` and `style`, and the recipes `arrow` (`arrow`, `diamond`, `circle` or `none`, `arrow` by default) and `caption` (`show` or `hide`, `show` by default).

A vault changes these recipes for one profile through the setting *Graph presentation overrides*, without changing the generated files.
