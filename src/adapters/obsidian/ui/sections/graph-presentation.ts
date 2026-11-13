/** Safe presentation recipes read from a generic graph's schema-declared profile field. */
import type { GraphPresentationOverride } from "../../../../application";
import {
  isScalarKind,
  type MappingField,
  type ScalarField,
  type SequenceField,
} from "../../../../domain";
import {
  BUILT_IN_GRAPH_LAYOUT_STRATEGIES,
  type GraphLayoutStrategy,
  type GraphStructureCapability,
} from "./graph-layout-strategies";

interface CategoryPresentation {
  readonly title: string;
  readonly shape: string;
  readonly marker: string;
  readonly style: string;
}

interface NodeKindPresentation {
  readonly category: string;
  readonly title: string;
  readonly icon: string;
  readonly marker: string;
  readonly style: string;
}

interface EdgeKindPresentation {
  readonly title: string;
  readonly layer: string;
  readonly style: string;
  readonly arrow: GraphArrowRecipe;
  readonly caption: GraphCaptionRecipe;
}

export type GraphArrowRecipe = "arrow" | "diamond" | "circle" | "none";
export type GraphCaptionRecipe = "show" | "hide";

export interface GraphPresentationProfile {
  readonly id: string;
  readonly version: number;
  readonly initialLayout: GraphLayoutStrategy;
  readonly layouts: readonly GraphLayoutStrategy[];
  readonly categories: ReadonlyMap<string, CategoryPresentation>;
  readonly nodeKinds: ReadonlyMap<string, NodeKindPresentation>;
  readonly edgeKinds: ReadonlyMap<string, EdgeKindPresentation>;
}

export interface NodePresentationInput {
  readonly category: string;
  readonly categoryLabel: string;
  readonly shape: string;
  readonly marker: string;
  readonly kind: string;
}

export interface ResolvedNodePresentation {
  readonly categoryLabel: string;
  readonly shape: string;
  readonly marker: string;
  readonly kindLabel: string;
  readonly icon: string;
  readonly categoryStyle: string;
  readonly kindStyle: string;
}

export interface EdgePresentationInput {
  readonly kind: string;
  readonly label: string;
}

export interface ResolvedEdgePresentation {
  readonly label: string;
  readonly kindLabel: string;
  readonly layer: string;
  readonly style: string;
  readonly arrow: GraphArrowRecipe;
  readonly caption: GraphCaptionRecipe;
}

const TOKEN = /^[a-z][a-z0-9-]*$/u;
const DEFAULT_LAYOUTS = ["layered-directed", "force-directed", "compact-network"] as const;

/** Read one graph-local profile and apply its matching vault-local visual override. */
export function readGraphPresentation(
  graph: MappingField,
  overrides: readonly GraphPresentationOverride[] = [],
): GraphPresentationProfile {
  const profile = graph.children.find(
    (child): child is MappingField => "children" in child && child.graphRole === "presentation",
  );
  if (profile === undefined) return fallbackProfile(graph);
  const id = token(profile, "profile");
  const version = number(profile, "version");
  const layouts = mapping(profile, "layouts");
  if (id === "" || version < 1 || layouts === null) return fallbackProfile(graph);
  const compatible = sequence(layouts, "compatible")?.items.flatMap((item) => {
    if (!isScalar(item) || typeof item.value !== "string") return [];
    return TOKEN.test(item.value) ? [item.value] : [];
  });
  const available = BUILT_IN_GRAPH_LAYOUT_STRATEGIES.resolve(
    compatible ?? [],
    graphStructure(graph),
  );
  const fallback = fallbackProfile(graph);
  const admitted = available.length > 0 ? available : fallback.layouts;
  const recommended = BUILT_IN_GRAPH_LAYOUT_STRATEGIES.get(token(layouts, "recommended"));
  const initialLayout =
    recommended !== null && admitted.some((strategy) => strategy.id === recommended.id)
      ? recommended
      : (admitted[0] ?? fallback.initialLayout);
  const producer = {
    id,
    version,
    initialLayout,
    layouts: admitted,
    categories: entries(profile, "categories", categoryPresentation),
    nodeKinds: entries(profile, "node_kinds", nodeKindPresentation),
    edgeKinds: entries(profile, "edge_kinds", edgeKindPresentation),
  };
  return applyLocalOverride(
    producer,
    overrides.find((override) => override.profile === id && override.version === version),
  );
}

function applyLocalOverride(
  profile: GraphPresentationProfile,
  local: GraphPresentationOverride | undefined,
): GraphPresentationProfile {
  if (local === undefined) return profile;
  const compatible = local.layouts?.compatible;
  const narrowed =
    compatible === undefined
      ? profile.layouts
      : profile.layouts.filter((layout) => compatible.includes(layout.id));
  const layouts = narrowed.length > 0 ? narrowed : profile.layouts;
  const recommended = layouts.find((layout) => layout.id === local.layouts?.recommended);
  const retained = layouts.find((layout) => layout.id === profile.initialLayout.id);
  return {
    ...profile,
    initialLayout: recommended ?? retained ?? layouts[0] ?? profile.initialLayout,
    layouts,
    categories: mergePresentations(profile.categories, local.categories, (producer, override) => ({
      title: override.title ?? producer?.title ?? "",
      shape: override.shape ?? producer?.shape ?? "",
      marker: override.marker ?? producer?.marker ?? "",
      style: override.style ?? producer?.style ?? "",
    })),
    nodeKinds: mergePresentations(profile.nodeKinds, local.nodeKinds, (producer, override) => ({
      category: producer?.category || override.category || "",
      title: override.title ?? producer?.title ?? "",
      icon: override.icon ?? producer?.icon ?? "",
      marker: override.marker ?? producer?.marker ?? "",
      style: override.style ?? producer?.style ?? "",
    })),
    edgeKinds: mergePresentations(profile.edgeKinds, local.edgeKinds, (producer, override) => ({
      title: override.title ?? producer?.title ?? "",
      layer: producer?.layer || override.layer || "",
      style: override.style ?? producer?.style ?? "",
      arrow: override.arrow ?? producer?.arrow ?? "arrow",
      caption: override.caption ?? producer?.caption ?? "show",
    })),
  };
}

function mergePresentations<Producer, Override>(
  producer: ReadonlyMap<string, Producer>,
  local: Readonly<Record<string, Override>>,
  merge: (producer: Producer | undefined, local: Override) => Producer,
): ReadonlyMap<string, Producer> {
  const result = new Map(producer);
  for (const [identifier, override] of Object.entries(local)) {
    result.set(identifier, merge(result.get(identifier), override));
  }
  return result;
}

function fallbackProfile(graph: MappingField): GraphPresentationProfile {
  const layouts = BUILT_IN_GRAPH_LAYOUT_STRATEGIES.resolve(DEFAULT_LAYOUTS, graphStructure(graph));
  const initialLayout = layouts[0] ?? BUILT_IN_GRAPH_LAYOUT_STRATEGIES.get("force-directed");
  if (initialLayout === null) throw new Error("Missing built-in graph layout strategy");
  return {
    id: "",
    version: 0,
    initialLayout,
    layouts: layouts.length > 0 ? layouts : [initialLayout],
    categories: new Map(),
    nodeKinds: new Map(),
    edgeKinds: new Map(),
  };
}

function graphStructure(graph: MappingField): ReadonlySet<GraphStructureCapability> {
  const available = new Set<GraphStructureCapability>();
  if (graph.children.some((child) => child.graphRole === "nodes")) available.add("nodes");
  if (graph.children.some((child) => child.graphRole === "edges")) {
    available.add("directed-edges");
  }
  return available;
}

/** Resolve a node through producer defaults, then legacy fields, then renderer fallbacks. */
export function resolveNodePresentation(
  profile: GraphPresentationProfile,
  node: NodePresentationInput,
): ResolvedNodePresentation {
  const category = profile.categories.get(node.category);
  const registeredKind = profile.nodeKinds.get(node.kind);
  const kind = registeredKind?.category === node.category ? registeredKind : undefined;
  const categoryLabel = category?.title || node.categoryLabel || presentationTitle(node.category);
  return {
    categoryLabel,
    shape: category?.shape || node.shape,
    marker: kind?.marker || category?.marker || node.marker || categoryLabel.slice(0, 1),
    kindLabel: kind?.title || presentationTitle(node.kind || node.category),
    icon: kind?.icon ?? "",
    categoryStyle: category?.style ?? "",
    kindStyle: kind?.style ?? "",
  };
}

/** Resolve an edge through producer defaults, then its legacy label. */
export function resolveEdgePresentation(
  profile: GraphPresentationProfile,
  edge: EdgePresentationInput,
): ResolvedEdgePresentation {
  const registered = profile.edgeKinds.get(edge.kind);
  return {
    label: registered?.title || edge.label || presentationTitle(edge.kind),
    kindLabel: registered?.title || presentationTitle(edge.kind),
    layer: registered?.layer ?? "",
    style: registered?.style ?? "",
    arrow: registered?.arrow ?? "arrow",
    caption: registered?.caption ?? "show",
  };
}

function categoryPresentation(field: MappingField): CategoryPresentation | null {
  const titleText = text(field, "title");
  const shape = token(field, "shape");
  const marker = text(field, "marker");
  const style = token(field, "style");
  return titleText && shape && marker && style ? { title: titleText, shape, marker, style } : null;
}

function nodeKindPresentation(field: MappingField): NodeKindPresentation | null {
  const category = token(field, "category");
  const titleText = text(field, "title");
  const icon = token(field, "icon");
  const marker = text(field, "marker");
  const style = token(field, "style");
  return category && titleText && icon && marker && style
    ? { category, title: titleText, icon, marker, style }
    : null;
}

function edgeKindPresentation(field: MappingField): EdgeKindPresentation | null {
  const titleText = text(field, "title");
  const layer = token(field, "layer");
  const style = token(field, "style");
  const arrow = graphArrowRecipe(token(field, "arrow"));
  const caption = graphCaptionRecipe(token(field, "caption"));
  return titleText && layer && style ? { title: titleText, layer, style, arrow, caption } : null;
}

function graphArrowRecipe(value: string): GraphArrowRecipe {
  return value === "diamond" || value === "circle" || value === "none" ? value : "arrow";
}

function graphCaptionRecipe(value: string): GraphCaptionRecipe {
  return value === "hide" ? "hide" : "show";
}

function entries<Entry>(
  profile: MappingField,
  key: string,
  read: (field: MappingField) => Entry | null,
): ReadonlyMap<string, Entry> {
  const result = new Map<string, Entry>();
  for (const item of sequence(profile, key)?.items ?? []) {
    if (!("children" in item)) continue;
    const id = token(item, "id");
    const entry = read(item);
    if (id && entry !== null && !result.has(id)) result.set(id, entry);
  }
  return result;
}

function mapping(field: MappingField, key: string): MappingField | null {
  return (
    field.children.find(
      (child): child is MappingField => child.key === key && "children" in child,
    ) ?? null
  );
}

function sequence(field: MappingField, key: string): SequenceField | null {
  return (
    field.children.find((child): child is SequenceField => child.key === key && "items" in child) ??
    null
  );
}

function scalar(field: MappingField, key: string): ScalarField | null {
  return (
    field.children.find(
      (child): child is ScalarField => child.key === key && isScalarKind(child.kind),
    ) ?? null
  );
}

function isScalar(field: SequenceField["items"][number]): field is ScalarField {
  return isScalarKind(field.kind);
}

function text(field: MappingField, key: string): string {
  const value = scalar(field, key)?.value;
  return typeof value === "string" ? value.trim() : "";
}

function token(field: MappingField, key: string): string {
  const value = text(field, key);
  return TOKEN.test(value) ? value : "";
}

function number(field: MappingField, key: string): number {
  const value = scalar(field, key)?.value;
  return typeof value === "number" && Number.isInteger(value) ? value : 0;
}

export function presentationTitle(value: string): string {
  return value.replace(/-/gu, " ");
}
