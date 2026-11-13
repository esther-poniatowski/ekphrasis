/** Pure node and relation projections for the generic graph renderer. */
import { presentationTitle } from "./graph-presentation";

export interface GraphRelation {
  readonly source: string;
  readonly target: string;
  readonly kind: string;
  readonly kindLabel: string;
  readonly layer: string;
}

export interface GraphProjectionNode {
  readonly id: string;
  readonly category: string;
  readonly categoryLabel: string;
  readonly kind: string;
  readonly kindLabel: string;
  readonly family: string;
  readonly status: string;
}

export type NodeFacetKey = "categories" | "kinds" | "families" | "statuses";

export interface NodeFacetOption {
  readonly id: string;
  readonly label: string;
  readonly count: number;
}

export interface NodeFacet {
  readonly key: NodeFacetKey;
  readonly label: string;
  readonly options: readonly NodeFacetOption[];
}

export type HiddenNodeFacets = Readonly<Record<NodeFacetKey, ReadonlySet<string>>>;

export interface RelationLayer {
  readonly id: string;
  readonly label: string;
  readonly count: number;
}

export interface RelationKind {
  readonly id: string;
  readonly label: string;
  readonly count: number;
}

/** Create one independent, initially inclusive node-facet selection. */
export function emptyHiddenNodeFacets(): HiddenNodeFacets {
  return {
    categories: new Set(),
    kinds: new Set(),
    families: new Set(),
    statuses: new Set(),
  };
}

/** List each usable node facet and its values in first-appearance order. */
export function nodeFacets(nodes: readonly GraphProjectionNode[]): readonly NodeFacet[] {
  const definitions: readonly {
    key: NodeFacetKey;
    label: string;
    value: (node: GraphProjectionNode) => string | null;
    display: (node: GraphProjectionNode) => string;
  }[] = [
    {
      key: "categories",
      label: "Categories",
      value: (node) => node.category,
      display: (node) => node.categoryLabel || presentationTitle(node.category) || "Unspecified",
    },
    {
      key: "kinds",
      label: "Kinds",
      value: (node) => node.kind,
      display: (node) => node.kindLabel || presentationTitle(node.kind) || "Unspecified",
    },
    {
      key: "families",
      label: "Activity families",
      value: (node) => node.family || null,
      display: (node) => presentationTitle(node.family),
    },
    {
      key: "statuses",
      label: "Statuses",
      value: (node) => node.status,
      display: (node) => presentationTitle(node.status) || "Unspecified",
    },
  ];
  return definitions.flatMap((definition) => {
    const options = new Map<string, NodeFacetOption>();
    for (const node of nodes) {
      const id = definition.value(node);
      if (id === null) continue;
      const existing = options.get(id);
      options.set(id, {
        id,
        label: existing?.label ?? definition.display(node),
        count: (existing?.count ?? 0) + 1,
      });
    }
    return options.size === 0
      ? []
      : [{ key: definition.key, label: definition.label, options: [...options.values()] }];
  });
}

/** Hide node values by union within each facet and intersection across the four facets. */
export function filterNodes<Node extends GraphProjectionNode>(
  nodes: readonly Node[],
  hidden: HiddenNodeFacets,
): readonly Node[] {
  return nodes.filter(
    (node) =>
      !hidden.categories.has(node.category) &&
      !hidden.kinds.has(node.kind) &&
      (node.family === "" || !hidden.families.has(node.family)) &&
      !hidden.statuses.has(node.status),
  );
}

/** Change one checkbox without mutating the other node-facet selections. */
export function setNodeFacetVisibility(
  hidden: HiddenNodeFacets,
  facet: NodeFacetKey,
  value: string,
  visible: boolean,
): HiddenNodeFacets {
  const values = new Set(hidden[facet]);
  if (visible) values.delete(value);
  else values.add(value);
  return { ...hidden, [facet]: values };
}

/** List the relation layers used by the graph, retaining their first-appearance order. */
export function relationLayers(relations: readonly GraphRelation[]): readonly RelationLayer[] {
  const counts = new Map<string, number>();
  for (const relation of relations) {
    counts.set(relation.layer, (counts.get(relation.layer) ?? 0) + 1);
  }
  return [...counts].map(([id, count]) => ({
    id,
    label: id ? presentationTitle(id) : "Other relations",
    count,
  }));
}

/** List the relation kinds used by the graph, retaining their first-appearance order. */
export function relationKinds(relations: readonly GraphRelation[]): readonly RelationKind[] {
  const kinds = new Map<string, RelationKind>();
  for (const relation of relations) {
    const existing = kinds.get(relation.kind);
    kinds.set(relation.kind, {
      id: relation.kind,
      label:
        existing?.label ?? relation.kindLabel ?? presentationTitle(relation.kind) ?? "Unspecified",
      count: (existing?.count ?? 0) + 1,
    });
  }
  return [...kinds.values()];
}

/** Remove every relation whose semantic layer is hidden. */
export function filterRelationLayers<Relation extends GraphRelation>(
  relations: readonly Relation[],
  hiddenLayers: ReadonlySet<string>,
): readonly Relation[] {
  return hiddenLayers.size === 0
    ? relations
    : relations.filter((relation) => !hiddenLayers.has(relation.layer));
}

/** Remove every relation whose semantic kind is hidden. */
export function filterRelationKinds<Relation extends GraphRelation>(
  relations: readonly Relation[],
  hiddenKinds: ReadonlySet<string>,
): readonly Relation[] {
  return hiddenKinds.size === 0
    ? relations
    : relations.filter((relation) => !hiddenKinds.has(relation.kind));
}

/** Find immediate neighbours, or every directed route entering or leaving one selected node. */
export function focusedNodes(
  selected: string,
  relations: readonly GraphRelation[],
  traceRoutes: boolean,
): ReadonlySet<string> {
  const focused = new Set([selected]);
  if (!traceRoutes) {
    for (const relation of relations) {
      if (relation.source === selected) focused.add(relation.target);
      if (relation.target === selected) focused.add(relation.source);
    }
    return focused;
  }
  const visit = (direction: "incoming" | "outgoing"): void => {
    const queue = [selected];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      if (current === undefined) continue;
      for (const relation of relations) {
        const next =
          direction === "outgoing" && relation.source === current
            ? relation.target
            : direction === "incoming" && relation.target === current
              ? relation.source
              : null;
        if (next === null || focused.has(next)) continue;
        focused.add(next);
        queue.push(next);
      }
    }
  };
  visit("incoming");
  visit("outgoing");
  return focused;
}
