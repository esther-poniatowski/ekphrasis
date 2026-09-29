---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Key paths
---
# Key paths

A key path designates one key of a YAML note, or one item of a sequence, without any declaration in the YAML note. The same syntax serves three consumers:

- the [key references](references.md), to link the node from any note;
- the patterns of [view specifications](view-specifications.md), to declare how the matched keys display;
- any program that reads the data, to follow a reference from the data alone.

## Segments

A key path reaches its node from the root of the body, through a sequence of segments separated by dots. Each segment is interpreted according to the type of its parent node: under a mapping, a segment names a key, and under a sequence, a segment designates an item.

| Parent node | Segment | Designated node |
| --- | --- | --- |
| Mapping | `objective` | Value of the key `objective` |
| Mapping | `"a.b"` | Value of the key `a.b`, whose name contains a dot |
| Sequence | `1` | Item at position 1, counted from zero |
| Sequence of mappings | `name=encoder` | Item whose key `name` holds the value `encoder` |

In the body below, the path `model.components.name=encoder` designates the first item of the sequence, and the path `model.components.1.input` designates the input of the second item:

```yaml
model:
  objective: "Evidence lower bound"
  components:
    - name: encoder
      input: "observation"
    - name: decoder
      input: "latent sample"
```

No segment contains brackets, since a wikilink ends at the first double closing bracket.

## Stability

A reference to an item of a sequence must survive a reordering of the items, as the decision on [key-path references](../adr/key-path-references.md) requires. The position of an item changes whenever another item is inserted, removed or moved before it, whereas the value of an identifying key stays fixed. Therefore, each item of a sequence referenced from other notes should carry an identifying key, and references should designate the items by value segments. When a value segment matches several items, the segment designates the first of them. In that case, the reading mode reports the duplicate values. ^stability

## Characters in key names

When a key name contains a dot, the name is written between double quotes in the key path. A key path written inside a link must also respect the link syntax of Obsidian, in which four characters (`#`, `|`, `^` and `:`) may break an [internal link](https://help.obsidian.md/links). Therefore, when a key name holds one of these characters, the key can be referenced only from a Markdown link, where the character is percent-encoded. A space in a key name is encoded as `%20` in a Markdown link, as in any link path.

## Wildcards

To let one rule match several keys, the patterns of view specifications admit two wildcard segments:

| Segment | Nodes matched |
| --- | --- |
| `*` | Any single key of a mapping, or any single item of a sequence |
| `**` | Any sequence of segments, the empty sequence included |

A key reference admits no wildcard, since it designates one node.
