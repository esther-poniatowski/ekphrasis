---
tags:
  - architecture
index: "[Architecture](docs/architecture/_index.md)"
aliases:
  - Rendering pipeline
---
# Rendering pipeline

The rendering pipeline transforms the text of a YAML note into the display of its reading mode. Each stage takes the output of its predecessor, in the following order:

1. **Separation** splits the frontmatter from the body, and passes on the body with the line at which it starts.
2. **Parsing** converts the body into a tree that keeps the scalar style and the source range of each node.
3. **Specification** assigns a presentation specification to each node, from the view specification of the note or else from the default presentation.
4. **Projection** selects, for each node, the renderer of highest priority that accepts the node. The selected renderers emit a sequence of Markdown blocks with a source map.
5. **Presentation** renders each block with the Markdown renderer of Obsidian, into a container element of its own.

Only this last stage depends on Obsidian.

The display derives from generated Markdown instead of elements built directly, for the reasons recorded in the decision on the [Markdown projection](../adr/markdown-projection.md).

## Projection

The projection is a pure function of the tree, of the specifications and of the registry of renderers. Therefore, the projection runs without Obsidian, and unit tests call the projection directly.

Each renderer is a strategy registered with a priority. A renderer restricted to a narrow class of values receives a higher priority than the generic renderers. Therefore, the narrow renderer takes precedence wherever it accepts a node. The generic renderers stay unchanged when such a renderer is registered.

## Source map

To trace the display back to the YAML source, each block of the projection records the key path and the source range of the node that emitted the block. The presentation stage copies both values into attributes of the container of the block. Three features read these attributes from the display:

- [key references](../features/references.md), whose links scroll to the container carrying their key path;
- parse errors, whose report locates the failing line;
- the planned editor of individual nodes, mapping a container back to its source range.

## Containers

Each key becomes addressable in the display because each block renders into a container of its own. Therefore, each block costs one call to the Markdown renderer. The containers of a section are nested in the container of its heading, so that a folded section hides its content. For long YAML notes, a planned measure bounds the cost of these calls to the renderer by rendering first the blocks that enter the visible area.
