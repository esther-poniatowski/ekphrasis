/** Generic interactive graph built entirely from schema-declared graph roles. */
import { useMemo, useState } from "preact/hooks";
import type { JSX } from "preact";
import {
  isScalarKind,
  type GraphRole,
  type MappingField,
  type ScalarField,
  type SequenceField,
} from "../../../../domain";
import type { ControlProps } from "../control-registry";
import { displayedValue, formatScalar, UNFILLED_MARK } from "../controls/scalar-format";
import { DisabledNote, forbidsItself, useDisabling } from "../disabled-note";
import { LockNote, useLockDisclosure } from "../field-label";
import { useFormContext } from "../form-context";
import { IssueList } from "../issue-list";
import { GroupSection } from "./group-section";
import {
  GRAPH_NODE_HEIGHT,
  GRAPH_NODE_WIDTH,
  layoutGraph,
  type PositionedNode,
} from "./graph-layout";
import { SectionHeading, useFold } from "./section-heading";

interface DisplayNode {
  readonly field: MappingField;
  readonly id: string;
  readonly category: string;
  readonly categoryLabel: string;
  readonly shape: string;
  readonly marker: string;
  readonly kind: string;
  readonly family: string;
  readonly label: string;
  readonly statusAxis: string;
  readonly status: string;
  readonly root: boolean;
  readonly rootLabel: string;
}

interface DisplayEdge {
  readonly field: MappingField;
  readonly source: string;
  readonly target: string;
  readonly kind: string;
  readonly label: string;
}

const ZOOM_LEVELS = [0.6, 0.8, 1, 1.25, 1.5] as const;

export function GraphSection(props: ControlProps<MappingField>): JSX.Element {
  const { field, readOnly, actions } = props;
  if (!readOnly) return <GroupSection {...props} />;
  const graph = useMemo(() => readGraph(field), [field]);
  const disclosure = useLockDisclosure();
  const disabling = useDisabling(field);
  const fold = useFold(field);
  const { issues, errors } = useFormContext();
  const error = errors.get(field.id) ?? null;
  const initialRoot = graph.nodes.find((node) => node.root)?.id ?? null;
  const [selected, setSelected] = useState<string | null>(initialRoot);
  const [traceRoutes, setTraceRoutes] = useState(initialRoot !== null);
  const [zoomIndex, setZoomIndex] = useState(2);
  const focused = useMemo(
    () => (selected === null ? null : focusedNodes(selected, graph.edges, traceRoutes)),
    [selected, graph.edges, traceRoutes],
  );
  const visibleNodes = useMemo(
    () => (focused === null ? graph.nodes : graph.nodes.filter((node) => focused.has(node.id))),
    [focused, graph.nodes],
  );
  const visibleEdges = useMemo(
    () =>
      focused === null
        ? graph.edges
        : graph.edges.filter((edge) => focused.has(edge.source) && focused.has(edge.target)),
    [focused, graph.edges],
  );
  const layout = useMemo(
    () => layoutGraph(visibleNodes, visibleEdges),
    [visibleNodes, visibleEdges],
  );
  const zoom = ZOOM_LEVELS[zoomIndex] ?? 1;
  return (
    <section
      class="ekphrasis-group ekphrasis-graph-section"
      data-path={field.id}
      data-kind={field.kind}
      data-folded={fold.folded ? true : undefined}
      data-disabled={forbidsItself(field, disabling) ? true : undefined}
    >
      <SectionHeading field={field} fold={fold} disclosure={disclosure} actions={actions} />
      <LockNote field={field} disclosure={disclosure} />
      <DisabledNote field={field} constraint={disabling} />
      {error !== null && (
        <div class="ekphrasis-commit-error" role="alert">
          {error}
        </div>
      )}
      <IssueList issues={issues.at(field.id)} />
      {!fold.folded && (
        <div class="ekphrasis-group-body">
          <div class="ekphrasis-graph-toolbar" aria-label="Graph controls">
            <button
              type="button"
              aria-label="Zoom out"
              disabled={zoomIndex === 0}
              onClick={() => setZoomIndex((value) => Math.max(0, value - 1))}
            >
              −
            </button>
            <output aria-label="Zoom level">{Math.round(zoom * 100)}%</output>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              onClick={() => setZoomIndex((value) => Math.min(ZOOM_LEVELS.length - 1, value + 1))}
            >
              +
            </button>
            {selected !== null && (
              <>
                <button type="button" onClick={() => setTraceRoutes((value) => !value)}>
                  {traceRoutes ? "Show immediate relations" : "Trace complete routes"}
                </button>
                <button type="button" onClick={() => setSelected(null)}>
                  Show whole graph
                </button>
              </>
            )}
          </div>
          <div
            class="ekphrasis-graph-viewport"
            role="group"
            aria-label={field.label}
            style={{
              "--ekphrasis-graph-width": `${layout.width * zoom}px`,
              "--ekphrasis-graph-height": `${layout.height * zoom}px`,
            }}
          >
            <div
              class="ekphrasis-graph-canvas"
              style={{
                width: `${layout.width}px`,
                height: `${layout.height}px`,
                transform: `scale(${zoom})`,
              }}
            >
              <GraphEdges edges={visibleEdges} positions={layout.nodes} />
              {visibleNodes.map((node) => {
                const position = layout.nodes.get(node.id);
                if (position === undefined) return null;
                return (
                  <button
                    type="button"
                    key={node.id}
                    class="ekphrasis-graph-node"
                    data-category={node.category}
                    data-shape={node.shape}
                    data-root={node.root ? true : undefined}
                    data-selected={selected === node.id ? true : undefined}
                    data-path={node.field.id}
                    style={{ left: `${position.x}px`, top: `${position.y}px` }}
                    aria-pressed={selected === node.id}
                    onClick={() => setSelected((current) => (current === node.id ? null : node.id))}
                  >
                    <span class="ekphrasis-graph-node-header">
                      <span class="ekphrasis-graph-node-symbol" aria-hidden="true">
                        {node.marker || node.categoryLabel.slice(0, 1).toLocaleUpperCase()}
                      </span>
                      <span class="ekphrasis-graph-node-kind">{node.kind || node.category}</span>
                    </span>
                    <span class="ekphrasis-graph-node-category">
                      {node.categoryLabel || node.category}
                    </span>
                    {node.family && <span class="ekphrasis-graph-node-family">{node.family}</span>}
                    {node.root && node.rootLabel && (
                      <span class="ekphrasis-graph-root">{node.rootLabel}</span>
                    )}
                    <strong class="ekphrasis-graph-node-label">
                      {node.label || node.id || UNFILLED_MARK}
                    </strong>
                    <code class="ekphrasis-graph-node-id">{node.id}</code>
                    <span class="ekphrasis-graph-node-status">
                      <span>{node.statusAxis || "Status"}</span>
                      <strong>{node.status || "unspecified"}</strong>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function GraphEdges({
  edges,
  positions,
}: {
  readonly edges: readonly DisplayEdge[];
  readonly positions: ReadonlyMap<string, PositionedNode>;
}): JSX.Element {
  const lanes = edgeLanes(edges);
  return (
    <svg class="ekphrasis-graph-edges" aria-hidden="true">
      <defs>
        <marker
          id="ekphrasis-graph-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>
      {edges.map((edge, index) => {
        const source = positions.get(edge.source);
        const target = positions.get(edge.target);
        if (source === undefined || target === undefined) return null;
        const lane = lanes[index] ?? { index: 0, total: 1 };
        const route = edgeRoute(source, target, lane.index, lane.total);
        return (
          <g key={`${edge.source}:${edge.target}:${edge.kind}:${index}`} data-kind={edge.kind}>
            <path d={route.path} marker-end="url(#ekphrasis-graph-arrow)" />
            <text x={route.labelX} y={route.labelY} text-anchor="middle">
              {edge.label || edge.kind}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface EdgeLane {
  readonly index: number;
  readonly total: number;
}

function edgeLanes(edges: readonly DisplayEdge[]): readonly EdgeLane[] {
  const groups = new Map<string, number[]>();
  edges.forEach((edge, index) => {
    const key = `${edge.source}\u0000${edge.target}`;
    groups.set(key, [...(groups.get(key) ?? []), index]);
  });
  const lanes: EdgeLane[] = edges.map(() => ({ index: 0, total: 1 }));
  for (const indices of groups.values()) {
    indices.forEach((edgeIndex, laneIndex) => {
      lanes[edgeIndex] = { index: laneIndex, total: indices.length };
    });
  }
  return lanes;
}

function edgeRoute(
  source: PositionedNode,
  target: PositionedNode,
  laneIndex: number,
  laneTotal: number,
): { readonly path: string; readonly labelX: number; readonly labelY: number } {
  const offset = (laneIndex - (laneTotal - 1) / 2) * 18;
  const sourceMiddle = source.y + GRAPH_NODE_HEIGHT / 2 + offset;
  const targetMiddle = target.y + GRAPH_NODE_HEIGHT / 2 + offset;
  if (source.id === target.id) {
    const x = source.x + GRAPH_NODE_WIDTH;
    const middle = source.y + GRAPH_NODE_HEIGHT / 2;
    const loopX = x + 52 + Math.abs(offset);
    return {
      path: `M ${x} ${middle - 18} C ${loopX} ${middle - 18}, ${loopX} ${middle + 18}, ${x} ${middle + 18}`,
      labelX: loopX,
      labelY: middle - 7,
    };
  }
  if (target.x > source.x) {
    const x1 = source.x + GRAPH_NODE_WIDTH;
    const x2 = target.x;
    const middle = x1 + (x2 - x1) / 2;
    return {
      path: `M ${x1} ${sourceMiddle} C ${middle} ${sourceMiddle}, ${middle} ${targetMiddle}, ${x2} ${targetMiddle}`,
      labelX: middle,
      labelY: (sourceMiddle + targetMiddle) / 2 - 7,
    };
  }
  if (target.x < source.x) {
    const x1 = source.x;
    const x2 = target.x + GRAPH_NODE_WIDTH;
    const routeY = Math.min(source.y, target.y) - 28 - Math.abs(offset);
    return {
      path: `M ${x1} ${sourceMiddle} C ${x1 - 40} ${sourceMiddle}, ${x1 - 40} ${routeY}, ${x1} ${routeY} L ${x2} ${routeY} C ${x2 + 40} ${routeY}, ${x2 + 40} ${targetMiddle}, ${x2} ${targetMiddle}`,
      labelX: x1 + (x2 - x1) / 2,
      labelY: routeY - 7,
    };
  }
  const x = source.x + GRAPH_NODE_WIDTH;
  const loopX = x + 52 + Math.abs(offset);
  return {
    path: `M ${x} ${sourceMiddle} C ${loopX} ${sourceMiddle}, ${loopX} ${targetMiddle}, ${x} ${targetMiddle}`,
    labelX: loopX,
    labelY: (sourceMiddle + targetMiddle) / 2 - 7,
  };
}

function readGraph(field: MappingField): {
  readonly nodes: readonly DisplayNode[];
  readonly edges: readonly DisplayEdge[];
} {
  const nodes =
    roleSequence(field, "nodes")?.items.flatMap((item) =>
      "children" in item
        ? [
            {
              field: item,
              id: roleText(item, "node-id"),
              category: roleText(item, "node-category"),
              categoryLabel: roleText(item, "node-category-label"),
              shape: roleText(item, "node-shape"),
              marker: roleText(item, "node-marker"),
              kind: roleText(item, "node-kind"),
              family: roleText(item, "node-family"),
              label: roleText(item, "node-label"),
              statusAxis: roleText(item, "node-status-axis"),
              status: roleText(item, "node-status"),
              root: roleValue(item, "node-root") === true,
              rootLabel: roleText(item, "node-root-label"),
            },
          ]
        : [],
    ) ?? [];
  const edges =
    roleSequence(field, "edges")?.items.flatMap((item) =>
      "children" in item
        ? [
            {
              field: item,
              source: roleText(item, "edge-source"),
              target: roleText(item, "edge-target"),
              kind: roleText(item, "edge-kind"),
              label: roleText(item, "edge-label"),
            },
          ]
        : [],
    ) ?? [];
  return { nodes, edges };
}

function roleSequence(field: MappingField, role: GraphRole): SequenceField | null {
  return (
    field.children.find(
      (child): child is SequenceField => "items" in child && child.graphRole === role,
    ) ?? null
  );
}

function roleScalar(field: MappingField, role: GraphRole): ScalarField | null {
  return (
    field.children.find(
      (child): child is ScalarField => isScalarKind(child.kind) && child.graphRole === role,
    ) ?? null
  );
}

function roleValue(field: MappingField, role: GraphRole): ScalarField["value"] {
  return roleScalar(field, role)?.value ?? null;
}

function roleText(field: MappingField, role: GraphRole): string {
  const scalar = roleScalar(field, role);
  return scalar === null ? "" : formatScalar(displayedValue(scalar));
}

/** Immediate relations by default, or every directed route that enters or leaves `selected`. */
function focusedNodes(
  selected: string,
  edges: readonly DisplayEdge[],
  traceRoutes: boolean,
): ReadonlySet<string> {
  const focused = new Set([selected]);
  if (!traceRoutes) {
    for (const edge of edges) {
      if (edge.source === selected) focused.add(edge.target);
      if (edge.target === selected) focused.add(edge.source);
    }
    return focused;
  }
  const visit = (direction: "incoming" | "outgoing"): void => {
    const queue = [selected];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      if (current === undefined) continue;
      for (const edge of edges) {
        const next =
          direction === "outgoing" && edge.source === current
            ? edge.target
            : direction === "incoming" && edge.target === current
              ? edge.source
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
