---
tags:
  - feature
index: "[Features](docs/features/_index.md)"
aliases:
  - Field kinds
---
# Field kinds

Each field is filled through the control of its kind, as the [requirement on typed controls](../requirements.md#^typed-controls) demands. The kind of a field is declared by the keyword `x-kind` of its schema, or else derived from the standard keywords of that schema. A declared kind overrides the derived one, for instance to display a sequence of mappings with many scalar keys as collapsible groups instead of a table.

## Scalar kinds

A scalar kind holds one value per field:

| Kind | Value in the YAML file | Control | Derived from |
| --- | --- | --- | --- |
| `label` | One word, without spaces | Single-line input | `x-kind` only |
| `text` | One line of plain text | Single-line input | `type: string` |
| `markdown-line` | One line of inline Markdown | Single-line input, with a rendered display | `x-kind` only |
| `markdown` | Paragraphs of Markdown | Multi-line input, with a rendered display | `x-kind` only |
| `latex` | LaTeX formula, without delimiters | Single-line input, with a display formula aligned by the keyword `x-align` | `x-kind` only |
| `number` | Integer or decimal number | Single-line input with a decimal keyboard | `type: number` or `type: integer` |
| `boolean` | `true` or `false` | Toggle | `type: boolean` |
| `choice` | One of the admitted values | Dropdown | `enum`, or `oneOf` of `const` values |

The input of the kinds `text`, `markdown-line` and `latex` wraps a long value onto several lines, and grows to show the whole value, so that the end of the value stays editable. A value on one line stays on one line in the file: the key `Enter` commits it instead of inserting a line break, and a line break pasted into the input becomes a space. A value already holding a line break, such as a block scalar written in the source, keeps its line breaks, so that an edit loses no line of it: the key `Enter` inserts a line break, and a pasted line break stays. The kind `markdown-line` still reports such a value, by its implicit rule below.

Two kinds carry an implicit rule. The kind `label` admits one word only, and the kind `markdown-line` admits no line break. [Validation](validation.md) checks both rules like any declared rule. In a `oneOf` of `const` values, each value may carry a `title` and a `description`. The dropdown displays the title, and the instructions of the field list the descriptions on demand, as the [form view](form-view.md#^option-descriptions) specifies.

## Collection kinds

A collection kind holds several values, each filled through the control of its own kind:

| Kind | Value in the YAML file | Control | Derived from |
| --- | --- | --- | --- |
| `choices` | Sequence of admitted values, each at most once | Checkboxes | `type: array` with `items.enum` and `uniqueItems: true` |
| `list` | Sequence of scalars | Compact inline inputs or expanded rows of inputs, with a toggle between them | `type: array` with scalar `items` |
| `group` | Mapping with declared keys | Collapsible section, holding one field per key | `type: object` with `properties` |
| `table` | Sequence of mappings whose values are scalars | Table with one row per item and one column per key, with buttons to add, remove and reorder rows | `type: array` whose `items` declare scalar properties only |
| `tree` | Ordered node mappings, each carrying its depth | Nested read-only outline; editable values retain the `records` control | `x-kind` only |
| `keyed-table` | Mapping from identifiers to mappings whose values are scalars | Table whose first column holds the identifier, with an input naming a new entry and buttons removing entries | `type: object` whose `additionalProperties` or `patternProperties` declare scalar properties only |
| `records` | Sequence of mappings with nested values | Sequence of collapsible groups, with buttons to add, remove and reorder groups | `type: array` whose `items` declare a nested property |
| `keyed-records` | Mapping from identifiers to mappings with nested values | Sequence of collapsible groups, each headed by its identifier, with an input naming a new entry and buttons removing entries | `type: object` whose `additionalProperties` or `patternProperties` declare a nested property |
| `alternatives` | Value matching one of several subschemas | Selector of the alternative, followed by the fields of the selected alternative | `oneOf` of object schemas |

A field of kind `list` opens in the compact layout. The declaration `x-list-layout: expanded` overrides that default. The compact layout follows list-valued Obsidian properties and edits its scalar items inline. By contrast, the expanded layout places one control per row.

Both layouts let the author:

- edit an item;
- add an item;
- remove an item;
- reorder items.

A control at the field toggles between the layouts. During that view, the chosen layout stays active while the view displays the file. When the view closes or displays another file, it forgets the choice. Therefore, reopening the file restores the layout declared by its schema, or the compact default. Switching layouts changes no source text. The [rationale for list layouts](../adr/list-layouts.md) compares the alternatives. ^list-layouts

Each column of a table takes the kind of its property, so a cell can hold a scalar control or a nested field. A column of kind `choice` takes the width of its dropdown. An alternative nested in a cell displays its selector and selected fields on one row. The other columns share the remaining width of the table. A table grows by one row at a time. The new row displays as a draft, and its first committed cell writes it into the file, as specified for [new entries](saving.md#^structural-edits). An issue on a cell displays in that cell. A new entry of a keyed kind is named before its draft displays, and its identifier must differ from the identifiers already present.

In a read-only table, a value of kind `label` displays as an unbroken literal token, and a value of kind `latex` displays as an inline formula. A table wider or taller than its viewport scrolls within a keyboard-focusable region, while its column headings remain visible during vertical scrolling.

A cell of kind `list` displays its items as one summary: one token per item, in the order of the file, wrapped within the width of the column. An empty list displays the mark `—` of an [unfilled value](form-view.md#^unfilled-display). In an editable cell, the summary acts as a button. A click on it, or the key `Enter` or `Space` while it holds the focus, opens below it the control that a row of the form displays for the list, and a second activation closes that control. A read-only or disabled cell displays the summary alone, so it offers no control. The token of an item holding an issue carries the mark of that issue. While the control is closed, the issues of the list and of its items display below the summary. The summary is a display of the cell, not one of the [layouts of a list](#^list-layouts).

A read-only field of kind `tree` displays the nodes in producer order as a nested outline. Each scalar node property declares its role through the keyword `x-tree-role`. The depth role fixes the parent of each node. The remaining roles fix the displayed label, identifier and details. The producer retains control of the nodes, their order and their domain semantics. A writable field of kind `tree` retains the ordinary `records` control because Ekphrasis defines no inline tree editor. ^tree-kind

A read-only field of kind `graph` displays schema-declared nodes and directed edges on a graph canvas. The keyword `x-graph-role` identifies the arrays that hold nodes and edges. The same keyword identifies their endpoints and every displayed node or edge property. The producer supplies the text shown for each node, along with optional links, markers and shapes. The producer also supplies roots, status axes and edge labels. Two layouts serve different research tasks over this same graph. The default layered layout shows how an inquiry proceeds from its starting problem through activities and products. Successive directed ranks run from top to bottom, while parallel branches occupy neighboring columns. With a declared root, this layout places its incoming source and activity ancestors in the preceding ranks, followed by its outgoing route and then independent components. If the producer omits a root, the layered layout opens on the complete graph. The network layout shows how the nodes in the current scope connect. Switching layouts retains the selected node and the current scope; *Show whole graph* adds the independent components. Deterministic forces place the network nodes. The resulting global topology includes cross-links, cycles and independent components. A researcher can drag a network card within the current view. Dragging changes only view-local coordinates. The generated YAML and producer semantics stay unchanged. The reset control recomputes every card's coordinates. The *Cards* selector controls the displayed detail. A minimal card retains the marker, kind and a single-line caption. A compact card adds status. An expanded card adds labelled category, family, identifier and status-axis details. The visible cards form one stop in the Tab sequence. An arrow key first moves to an incident card in its direction and otherwise to the nearest visible card. *Home* and *End* move to the first and last visible cards in top-left reading order. Each move announces the card and the incoming or outgoing relation followed. *Enter* or *Space* applies the existing focus selection to the current card. Focus controls can narrow either layout to immediate relations or complete directed routes without moving surviving cards. The *Nodes* disclosure groups values by category, kind, activity family and status. Checked values combine by union within one facet and by intersection across facets. The activity-family facet applies only to nodes that declare a family, so the products and sources around a filtered activity stream remain available. Node filtering removes incident edges and prevents route tracing through hidden nodes. The selected node and complete-graph coordinates persist while that node satisfies the filters. The *Relations* disclosure groups edges by broad relation layer and by individual relation kind whenever either group offers more than one choice. Checked values combine by union within each group and by intersection between the groups. A registered edge-kind title labels its choice; an unregistered kind uses its normalized identifier. Clearing a layer or kind removes its edges from the current projection and from route tracing, but retains the selected node and the coordinates computed for the complete graph. Both disclosures report visible and hidden counts after all filters and focus constraints. Ekphrasis also supplies scrolling, zoom and selection. A writable field of kind `graph` retains the ordinary `group` control because Ekphrasis defines no graph editor. ^graph-kind

A graph may declare one mapping with the role `presentation`. The mapping carries a versioned profile, category fallbacks, node-kind recipes, edge-kind recipes and compatible layout identifiers. Ekphrasis reads only safe identifier tokens from this profile. A node recipe may select a Lucide icon and a text-marker fallback. An edge recipe selects one renderer-owned arrowhead from `arrow`, `diamond`, `circle` and `none`. The recipe may also hide the visible caption. When the recipe hides it, relation filters and keyboard navigation retain the semantic title. Category, node-kind and edge recipes may expose semantic style tokens through `data-category-style`, `data-kind-style` and `data-style`. These tokens select renderer-owned or user-authored CSS and never inject CSS, dimensions, colours or components. A registered title, icon, marker or edge caption takes precedence over the corresponding legacy field. Missing, unknown or unsafe recipes fall back to the legacy node and edge fields, so a retained graph without a profile renders as before. Ekphrasis resolves compatible layout identifiers through renderer-owned strategies. Each strategy declares its required graph structure, placement algorithm, edge routing and interaction capabilities. An incompatible or unknown strategy does not appear in the *Layout* selector. A known recommended strategy fixes the initial selection. The raw node category and kind remain available through `data-category` and `data-kind`. ^graph-presentation-profile

The setting *Graph presentation overrides* changes the visual recipes of one producer profile within the current vault. The setting accepts a JSON list keyed by profile identifier and version. The following entry changes one node kind and one edge kind, restricts the layout selector, and selects the remaining layout initially:

```json
[
  {
    "profile": "project-workflow",
    "version": 1,
    "layouts": {
      "recommended": "force-directed",
      "compatible": ["force-directed"]
    },
    "categories": {
      "artifact": { "title": "Research product", "marker": "◇", "style": "product" }
    },
    "nodeKinds": {
      "question": { "title": "Question", "icon": "circle-help", "style": "question" }
    },
    "edgeKinds": {
      "supports": { "title": "supports", "style": "evidence", "arrow": "diamond", "caption": "hide" }
    }
  }
]
```

The profile identifier and version must both match. The first entry for a profile is the only admitted entry; the settings editor reports a duplicate instead of saving it. Each valid local property replaces the corresponding producer property. The remaining properties continue through the producer profile, legacy node or edge value, and renderer fallback. An unknown Lucide icon displays the marker fallback. An override may register a missing category, node kind or edge kind. However, it cannot replace the producer-owned category of a registered node kind or the relation layer of a registered edge kind. Its compatible layouts can only narrow the layouts admitted by the producer. When the local list admits no producer layout, Ekphrasis retains the producer layouts. An unknown recommendation retains the producer recommendation. A new recommendation applies when the graph next opens; it does not replace a layout selected in an open graph. The editor identifies unknown keys, unsafe identifiers, duplicate profiles and invalid values, then retains the preceding valid setting. The stored-data parser still ignores each invalid unit independently, so damaged plugin data cannot prevent a producer profile from rendering. The setting changes no generated YAML file.

Style values name DOM hooks rather than CSS declarations. Add an Obsidian CSS snippet to give a hook its line colour, width or dash pattern. For example, a node-kind style named `question` can select `.ekphrasis-graph-node[data-kind-style="question"]`, and an edge style named `evidence` can select `.ekphrasis-graph-edge[data-style="evidence"]`. The snippet remains vault-local, while the JSON setting only selects its safe identifier. ^graph-presentation-overrides

A field of kind `alternatives` displays the fields of the alternative that its value matches. Choosing another alternative in the selector displays the fields of that alternative, each written by its first edit. Choosing another alternative also removes from the file each key that belongs to the previous alternative only, so the value never matches two alternatives, as the user decided on 2026-10-20. A key shared by both alternatives stays. When the removed keys were the only keys of a block mapping, the mapping is left with an empty value, and the first field filled in the new alternative is written in block form. When a removed key holds a filled value, a confirmation lists the fields whose values would be lost, and cancelling keeps the previous alternative. Every value counts as filled, except the null value and the unfilled values. A collection counts as filled when it holds a filled entry. A single commit removes all the keys. Therefore, when one key cannot be removed, the form keeps the previous alternative, and the file stays unchanged. Selecting `—` in the selector removes no key.
