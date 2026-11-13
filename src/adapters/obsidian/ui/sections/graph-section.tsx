/** Generic interactive graph built entirely from schema-declared graph roles. */
import { useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
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
import { Icon } from "../icon";
import { IssueList } from "../issue-list";
import { GroupSection } from "./group-section";
import {
  graphNavigationOrder,
  graphNavigationTarget,
  type GraphNavigationDirection,
} from "./graph-keyboard-navigation";
import type { PositionedNode } from "./graph-layout";
import type { GraphEdgeRouting } from "./graph-layout-strategies";
import {
  emptyHiddenNodeFacets,
  filterNodes,
  filterRelationKinds,
  filterRelationLayers,
  focusedNodes,
  nodeFacets,
  relationKinds,
  relationLayers,
  setNodeFacetVisibility,
} from "./graph-projection";
import {
  readGraphPresentation,
  resolveEdgePresentation,
  resolveNodePresentation,
  type GraphPresentationProfile,
} from "./graph-presentation";
import { SectionHeading, useFold } from "./section-heading";

interface DisplayNode {
  readonly field: MappingField;
  readonly id: string;
  readonly category: string;
  readonly categoryLabel: string;
  readonly shape: string;
  readonly marker: string;
  readonly kind: string;
  readonly kindLabel: string;
  readonly icon: string;
  readonly categoryStyle: string;
  readonly kindStyle: string;
  readonly family: string;
  readonly label: string;
  readonly link: string;
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
  readonly kindLabel: string;
  readonly label: string;
  readonly layer: string;
  readonly style: string;
  readonly arrow: "arrow" | "diamond" | "circle" | "none";
  readonly caption: "show" | "hide";
}

interface DragState {
  readonly id: string;
  readonly pointerId: number;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startX: number;
  readonly startY: number;
}

interface NodePosition {
  readonly x: number;
  readonly y: number;
}

const ZOOM_LEVELS = [0.6, 0.8, 1, 1.25, 1.5] as const;
type CardDensity = "minimal" | "compact" | "expanded";
const MINIMAL_NODE_WIDTH = 188;
const COMPACT_NODE_WIDTH = 264;
const MINIMAL_NODE_HEIGHT = 76;
const COMPACT_NODE_HEIGHT = 132;
const EXPANDED_NODE_HEIGHT = 196;
const POINT_NODE_WIDTH = 132;
const POINT_NODE_HEIGHT = 42;
const POINT_NODE_RADIUS = 7;
const POINT_NODE_CENTER_Y = 9;
const TEXT_PRESENTATION_SELECTOR = "\uFE0E";

function textPresentationMarker(marker: string): string {
  return marker.endsWith(TEXT_PRESENTATION_SELECTOR)
    ? marker
    : `${marker}${TEXT_PRESENTATION_SELECTOR}`;
}

export function GraphSection(props: ControlProps<MappingField>): JSX.Element {
  const { field, readOnly, actions } = props;
  if (!readOnly) return <GroupSection {...props} />;
  const { issues, errors, renderer, paintIcon, graphPresentationOverrides } = useFormContext();
  const graph = useMemo(
    () => readGraph(field, graphPresentationOverrides),
    [field, graphPresentationOverrides],
  );
  const disclosure = useLockDisclosure();
  const disabling = useDisabling(field);
  const fold = useFold(field);
  const error = errors.get(field.id) ?? null;
  const initialRoot = graph.nodes.find((node) => node.root)?.id ?? null;
  const [selected, setSelected] = useState<string | null>(initialRoot);
  const [traceRoutes, setTraceRoutes] = useState(initialRoot !== null);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [cardDensity, setCardDensity] = useState<CardDensity>("compact");
  const [layoutId, setLayoutId] = useState(graph.presentation.initialLayout.id);
  const [hiddenNodeFacets, setHiddenNodeFacets] = useState(emptyHiddenNodeFacets);
  const [hiddenRelationLayers, setHiddenRelationLayers] = useState<ReadonlySet<string>>(new Set());
  const [hiddenRelationKinds, setHiddenRelationKinds] = useState<ReadonlySet<string>>(new Set());
  const [keyboardNode, setKeyboardNode] = useState<string | null>(initialRoot);
  const [keyboardAnnouncement, setKeyboardAnnouncement] = useState("");
  const nodeButtons = useRef(new Map<string, HTMLButtonElement>());
  const [networkPositions, setNetworkPositions] = useState<ReadonlyMap<string, NodePosition>>(
    new Map(),
  );
  const [drag, setDrag] = useState<DragState | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (viewport === null) return;
    viewport.scrollLeft = 0;
    viewport.scrollTop = 0;
  }, [layoutId]);
  const layers = useMemo(() => relationLayers(graph.edges), [graph.edges]);
  const kinds = useMemo(() => relationKinds(graph.edges), [graph.edges]);
  const facets = useMemo(() => nodeFacets(graph.nodes), [graph.nodes]);
  const facetNodes = useMemo(
    () => filterNodes(graph.nodes, hiddenNodeFacets),
    [graph.nodes, hiddenNodeFacets],
  );
  const facetNodeIds = useMemo(() => new Set(facetNodes.map((node) => node.id)), [facetNodes]);
  const activeEdges = useMemo(
    () =>
      filterRelationKinds(
        filterRelationLayers(graph.edges, hiddenRelationLayers),
        hiddenRelationKinds,
      ).filter((edge) => facetNodeIds.has(edge.source) && facetNodeIds.has(edge.target)),
    [facetNodeIds, graph.edges, hiddenRelationKinds, hiddenRelationLayers],
  );
  const effectiveSelected = selected !== null && facetNodeIds.has(selected) ? selected : null;
  const focused = useMemo(
    () =>
      effectiveSelected === null ? null : focusedNodes(effectiveSelected, activeEdges, traceRoutes),
    [effectiveSelected, activeEdges, traceRoutes],
  );
  const visibleNodes = useMemo(
    () => (focused === null ? facetNodes : facetNodes.filter((node) => focused.has(node.id))),
    [facetNodes, focused],
  );
  const visibleEdges = useMemo(
    () =>
      focused === null
        ? activeEdges
        : activeEdges.filter((edge) => focused.has(edge.source) && focused.has(edge.target)),
    [activeEdges, focused],
  );
  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes],
  );
  const keyboardNodeId =
    keyboardNode !== null && visibleNodeIds.has(keyboardNode)
      ? keyboardNode
      : effectiveSelected !== null && visibleNodeIds.has(effectiveSelected)
        ? effectiveSelected
        : (visibleNodes[0]?.id ?? null);
  const hiddenNodeCount = graph.nodes.length - visibleNodes.length;
  const hiddenEdgeCount = graph.edges.length - visibleEdges.length;
  const layoutStrategy =
    graph.presentation.layouts.find((strategy) => strategy.id === layoutId) ??
    graph.presentation.initialLayout;
  const pointNodes = layoutStrategy.nodePresentation === "point";
  const expandedCards = cardDensity === "expanded";
  const nodeWidth = pointNodes
    ? POINT_NODE_WIDTH
    : cardDensity === "minimal"
      ? MINIMAL_NODE_WIDTH
      : COMPACT_NODE_WIDTH;
  const nodeHeight = pointNodes
    ? POINT_NODE_HEIGHT
    : cardDensity === "minimal"
      ? MINIMAL_NODE_HEIGHT
      : expandedCards
        ? EXPANDED_NODE_HEIGHT
        : COMPACT_NODE_HEIGHT;
  const baseLayout = useMemo(
    () =>
      layoutStrategy.layout(graph.nodes, graph.edges, {
        nodeHeight,
        nodeWidth,
      }),
    [graph.nodes, graph.edges, layoutStrategy, nodeHeight, nodeWidth],
  );
  const layout = useMemo(
    () =>
      layoutStrategy.draggable && networkPositions.size > 0
        ? {
            ...baseLayout,
            nodes: new Map(
              [...baseLayout.nodes].map(([id, node]) => {
                const moved = networkPositions.get(id);
                return [id, moved === undefined ? node : { ...node, ...moved }];
              }),
            ),
          }
        : baseLayout,
    [baseLayout, layoutStrategy.draggable, networkPositions],
  );
  const navigationNodes = useMemo(
    () =>
      graphNavigationOrder(
        visibleNodes.flatMap((node) => {
          const position = layout.nodes.get(node.id);
          return position === undefined ? [] : [{ id: node.id, x: position.x, y: position.y }];
        }),
      ),
    [layout.nodes, visibleNodes],
  );
  const keyboardInstructionsId = `ekphrasis-graph-keyboard-${field.id.replace(/[^a-z0-9_-]/giu, "-")}`;
  const zoom = ZOOM_LEVELS[zoomIndex] ?? 1;
  return (
    <section
      class="ekphrasis-group ekphrasis-graph-section"
      data-path={field.id}
      data-kind={field.kind}
      data-folded={fold.folded ? true : undefined}
      data-disabled={forbidsItself(field, disabling) ? true : undefined}
      data-presentation-profile={graph.presentation.id || undefined}
      data-presentation-version={graph.presentation.version || undefined}
      data-visible-nodes={visibleNodes.length}
      data-hidden-nodes={hiddenNodeCount}
      data-visible-edges={visibleEdges.length}
      data-hidden-edges={hiddenEdgeCount}
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
            {!pointNodes && (
              <label class="ekphrasis-graph-density-control">
                <span>cards</span>
                <select
                  data-view-control="true"
                  aria-label="Card detail"
                  value={cardDensity}
                  onChange={(event) => setCardDensity(event.currentTarget.value as CardDensity)}
                >
                  <option value="minimal">minimal</option>
                  <option value="compact">compact</option>
                  <option value="expanded">expanded</option>
                </select>
              </label>
            )}
            <output aria-label="Zoom level">{Math.round(zoom * 100)}%</output>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              onClick={() => setZoomIndex((value) => Math.min(ZOOM_LEVELS.length - 1, value + 1))}
            >
              +
            </button>
            {graph.presentation.layouts.length > 1 && (
              <label class="ekphrasis-graph-layout-control">
                <span>layout</span>
                <select
                  data-view-control="true"
                  aria-label="Layout"
                  value={layoutStrategy.id}
                  onChange={(event) => {
                    setLayoutId(event.currentTarget.value);
                    setDrag(null);
                    setNetworkPositions(new Map());
                  }}
                >
                  {graph.presentation.layouts.map((strategy) => (
                    <option key={strategy.id} value={strategy.id}>
                      {strategy.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {layoutStrategy.draggable && networkPositions.size > 0 && (
              <button type="button" onClick={() => setNetworkPositions(new Map())}>
                reset node positions
              </button>
            )}
            {facets.length > 0 && (
              <details class="ekphrasis-graph-filter ekphrasis-graph-node-facets">
                <summary>
                  nodes · {visibleNodes.length} visible · {hiddenNodeCount} hidden
                </summary>
                <div class="ekphrasis-graph-filter-panel">
                  {facets.map((facet) => (
                    <fieldset key={facet.key}>
                      <legend>{facet.label}</legend>
                      {facet.options.map((option) => (
                        <label key={option.id}>
                          <input
                            type="checkbox"
                            data-view-control="true"
                            aria-label={`${option.label} (${option.count} ${option.count === 1 ? "node" : "nodes"})`}
                            checked={!hiddenNodeFacets[facet.key].has(option.id)}
                            onChange={(event) =>
                              setHiddenNodeFacets((current) =>
                                setNodeFacetVisibility(
                                  current,
                                  facet.key,
                                  option.id,
                                  event.currentTarget.checked,
                                ),
                              )
                            }
                          />
                          <span class="ekphrasis-graph-filter-label">{option.label}</span>
                          <span class="ekphrasis-graph-filter-count">
                            ({option.count} {option.count === 1 ? "node" : "nodes"})
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  ))}
                </div>
              </details>
            )}
            {(layers.length > 1 || kinds.length > 1) && (
              <details class="ekphrasis-graph-filter ekphrasis-graph-relations">
                <summary>
                  relations · {visibleEdges.length} visible · {hiddenEdgeCount} hidden
                </summary>
                <div class="ekphrasis-graph-filter-panel">
                  {layers.length > 1 && (
                    <fieldset>
                      <legend>relation layers</legend>
                      {layers.map((layer) => (
                        <label key={layer.id}>
                          <input
                            type="checkbox"
                            data-view-control="true"
                            aria-label={`${layer.label} (${layer.count} ${layer.count === 1 ? "relation" : "relations"})`}
                            checked={!hiddenRelationLayers.has(layer.id)}
                            onChange={(event) =>
                              setHiddenRelationLayers((current) => {
                                const next = new Set(current);
                                if (event.currentTarget.checked) next.delete(layer.id);
                                else next.add(layer.id);
                                return next;
                              })
                            }
                          />
                          <span class="ekphrasis-graph-filter-label">{layer.label}</span>
                          <span class="ekphrasis-graph-filter-count">
                            ({layer.count} {layer.count === 1 ? "relation" : "relations"})
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  )}
                  {kinds.length > 1 && (
                    <fieldset>
                      <legend>relation kinds</legend>
                      {kinds.map((kind) => (
                        <label key={kind.id}>
                          <input
                            type="checkbox"
                            data-view-control="true"
                            aria-label={`${kind.label} (${kind.count} ${kind.count === 1 ? "relation" : "relations"})`}
                            checked={!hiddenRelationKinds.has(kind.id)}
                            onChange={(event) =>
                              setHiddenRelationKinds((current) => {
                                const next = new Set(current);
                                if (event.currentTarget.checked) next.delete(kind.id);
                                else next.add(kind.id);
                                return next;
                              })
                            }
                          />
                          <span class="ekphrasis-graph-filter-label">{kind.label}</span>
                          <span class="ekphrasis-graph-filter-count">
                            ({kind.count} {kind.count === 1 ? "relation" : "relations"})
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  )}
                </div>
              </details>
            )}
            {effectiveSelected !== null && (
              <>
                <button type="button" onClick={() => setTraceRoutes((value) => !value)}>
                  {traceRoutes ? "show immediate relations" : "trace complete routes"}
                </button>
                <button type="button" onClick={() => setSelected(null)}>
                  show whole graph
                </button>
              </>
            )}
          </div>
          <div
            ref={viewportRef}
            class="ekphrasis-graph-viewport"
            role="group"
            aria-label={field.label}
            data-layout={layoutStrategy.viewport}
            data-layout-strategy={layoutStrategy.id}
            style={{
              "--ekphrasis-graph-width": `${layout.width * zoom}px`,
              "--ekphrasis-graph-height": `${layout.height * zoom}px`,
            }}
          >
            <span id={keyboardInstructionsId} class="ekphrasis-visually-hidden">
              Use the arrow keys to move between visible nodes. Home moves to the first node and End
              to the last. Enter or Space focuses the inquiry on the current node.
            </span>
            <span
              class="ekphrasis-visually-hidden"
              role="status"
              aria-label="Graph keyboard navigation"
              aria-live="polite"
            >
              {keyboardAnnouncement}
            </span>
            <div
              class="ekphrasis-graph-canvas"
              style={{
                width: `${layout.width}px`,
                height: `${layout.height}px`,
                transform: `scale(${zoom})`,
              }}
            >
              <GraphEdges
                edges={visibleEdges}
                positions={layout.nodes}
                nodeWidth={nodeWidth}
                nodeHeight={nodeHeight}
                routing={layoutStrategy.edgeRouting}
                showCaptions={layoutStrategy.edgeCaptions}
                markerPrefix={field.id.replace(/[^a-z0-9_-]/giu, "-")}
              />
              {visibleNodes.map((node) => {
                const position = layout.nodes.get(node.id);
                if (position === undefined) return null;
                return (
                  <article
                    key={node.id}
                    class="ekphrasis-graph-node"
                    data-category={node.category}
                    data-kind={node.kind}
                    data-shape={node.shape}
                    data-category-style={node.categoryStyle || undefined}
                    data-kind-style={node.kindStyle || undefined}
                    data-root={node.root ? true : undefined}
                    data-selected={effectiveSelected === node.id ? true : undefined}
                    data-expanded={!pointNodes && expandedCards ? true : undefined}
                    data-density={cardDensity}
                    data-presentation={layoutStrategy.nodePresentation}
                    data-draggable={layoutStrategy.draggable ? true : undefined}
                    data-path={node.field.id}
                    title={layoutStrategy.draggable ? "Drag this node to reposition it" : undefined}
                    style={{
                      left: `${position.x}px`,
                      top: `${position.y}px`,
                      width: `${nodeWidth}px`,
                      height: `${nodeHeight}px`,
                    }}
                    onPointerDown={(event) => {
                      if (!layoutStrategy.draggable) return;
                      const target = event.target as Element;
                      if (
                        target.closest("a") !== null ||
                        (!pointNodes && target.closest("button") !== null)
                      ) {
                        return;
                      }
                      event.preventDefault();
                      event.currentTarget.setPointerCapture?.(event.pointerId);
                      setDrag({
                        id: node.id,
                        pointerId: event.pointerId,
                        startClientX: event.clientX,
                        startClientY: event.clientY,
                        startX: position.x,
                        startY: position.y,
                      });
                    }}
                    onPointerMove={(event) => {
                      if (
                        drag === null ||
                        drag.id !== node.id ||
                        drag.pointerId !== event.pointerId
                      ) {
                        return;
                      }
                      const x = bounded(
                        drag.startX + (event.clientX - drag.startClientX) / zoom,
                        0,
                        layout.width - nodeWidth,
                      );
                      const y = bounded(
                        drag.startY + (event.clientY - drag.startClientY) / zoom,
                        0,
                        layout.height - nodeHeight,
                      );
                      setNetworkPositions((current) => {
                        const moved = new Map(current);
                        moved.set(node.id, { x, y });
                        return moved;
                      });
                    }}
                    onPointerUp={(event) => {
                      if (drag?.id !== node.id || drag.pointerId !== event.pointerId) {
                        return;
                      }
                      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                      }
                      setDrag(null);
                    }}
                  >
                    <button
                      type="button"
                      class="ekphrasis-graph-node-focus"
                      aria-label={`Focus ${node.kindLabel}: ${node.label || node.id}`}
                      aria-describedby={keyboardInstructionsId}
                      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home End"
                      aria-pressed={effectiveSelected === node.id}
                      tabIndex={keyboardNodeId === node.id ? 0 : -1}
                      ref={(button) => {
                        if (button === null) nodeButtons.current.delete(node.id);
                        else nodeButtons.current.set(node.id, button);
                      }}
                      onFocus={() => setKeyboardNode(node.id)}
                      onClick={() => {
                        setKeyboardNode(node.id);
                        setSelected((current) => (current === node.id ? null : node.id));
                      }}
                      onKeyDown={(event) => {
                        const direction = navigationDirection(event.key);
                        const boundary =
                          event.key === "Home"
                            ? navigationNodes[0]
                            : event.key === "End"
                              ? navigationNodes.at(-1)
                              : undefined;
                        const target =
                          direction === null
                            ? boundary === undefined
                              ? null
                              : { id: boundary.id, relation: "" }
                            : graphNavigationTarget(
                                navigationNodes,
                                visibleEdges.map((edge) => ({
                                  source: edge.source,
                                  target: edge.target,
                                  label: edge.label || edge.kind,
                                })),
                                node.id,
                                direction,
                              );
                        if (target === null) return;
                        event.preventDefault();
                        const targetNode = visibleNodes.find((item) => item.id === target.id);
                        if (targetNode === undefined) return;
                        setKeyboardNode(target.id);
                        setKeyboardAnnouncement(
                          `${announcementSentence(
                            `${targetNode.kindLabel}: ${targetNode.label || targetNode.id}`,
                          )}${target.relation ? ` Relation: ${target.relation}.` : ""}`,
                        );
                        nodeButtons.current.get(target.id)?.focus();
                      }}
                    >
                      {pointNodes ? (
                        <span class="ekphrasis-graph-map-node-dot" aria-hidden="true" />
                      ) : (
                        <>
                          <span class="ekphrasis-graph-node-symbol" aria-hidden="true">
                            {node.icon ? (
                              <Icon
                                icon={node.icon}
                                paint={paintIcon}
                                class="ekphrasis-graph-node-icon"
                                fallback={textPresentationMarker(
                                  node.marker || node.categoryLabel.slice(0, 1).toLocaleUpperCase(),
                                )}
                              />
                            ) : (
                              <span class="ekphrasis-graph-node-marker">
                                {textPresentationMarker(
                                  node.marker || node.categoryLabel.slice(0, 1).toLocaleUpperCase(),
                                )}
                              </span>
                            )}
                          </span>
                          <span class="ekphrasis-graph-node-kind">{node.kindLabel}</span>
                        </>
                      )}
                    </button>
                    {pointNodes ? (
                      node.link ? (
                        <a
                          class="ekphrasis-graph-map-node-label"
                          href={node.link}
                          onClick={(event) => {
                            if (
                              node.link.startsWith("http://") ||
                              node.link.startsWith("https://")
                            ) {
                              return;
                            }
                            event.preventDefault();
                            renderer.follow(node.link, event.metaKey || event.ctrlKey);
                          }}
                        >
                          {node.label || node.id || UNFILLED_MARK}
                        </a>
                      ) : (
                        <strong class="ekphrasis-graph-map-node-label">
                          {node.label || node.id || UNFILLED_MARK}
                        </strong>
                      )
                    ) : (
                      <>
                        {node.root && node.rootLabel && (
                          <span class="ekphrasis-graph-root">{node.rootLabel}</span>
                        )}
                        {node.link ? (
                          <a
                            class="ekphrasis-graph-node-label"
                            href={node.link}
                            onClick={(event) => {
                              if (
                                node.link.startsWith("http://") ||
                                node.link.startsWith("https://")
                              ) {
                                return;
                              }
                              event.preventDefault();
                              renderer.follow(node.link, event.metaKey || event.ctrlKey);
                            }}
                          >
                            {node.label || node.id || UNFILLED_MARK}
                          </a>
                        ) : (
                          <strong class="ekphrasis-graph-node-label">
                            {node.label || node.id || UNFILLED_MARK}
                          </strong>
                        )}
                        {expandedCards && (
                          <dl class="ekphrasis-graph-node-details">
                            <div>
                              <dt>Category</dt>
                              <dd>{node.categoryLabel || node.category}</dd>
                            </div>
                            {node.family && (
                              <div>
                                <dt>Family</dt>
                                <dd class="ekphrasis-graph-node-family">{node.family}</dd>
                              </div>
                            )}
                            <div>
                              <dt>Identifier</dt>
                              <dd>
                                <code class="ekphrasis-graph-node-id">{node.id}</code>
                              </dd>
                            </div>
                          </dl>
                        )}
                        {cardDensity !== "minimal" && (
                          <span class="ekphrasis-graph-node-status">
                            <span>
                              Status
                              {expandedCards && node.statusAxis ? ` · ${node.statusAxis}` : ""}
                            </span>
                            <strong>{node.status || "unspecified"}</strong>
                          </span>
                        )}
                      </>
                    )}
                  </article>
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
  nodeWidth,
  nodeHeight,
  routing,
  showCaptions,
  markerPrefix,
}: {
  readonly edges: readonly DisplayEdge[];
  readonly positions: ReadonlyMap<string, PositionedNode>;
  readonly nodeWidth: number;
  readonly nodeHeight: number;
  readonly routing: GraphEdgeRouting;
  readonly showCaptions: boolean;
  readonly markerPrefix: string;
}): JSX.Element {
  const lanes = edgeLanes(edges);
  return (
    <svg class="ekphrasis-graph-edges" aria-hidden="true">
      {edges.map((edge, index) => {
        const source = positions.get(edge.source);
        const target = positions.get(edge.target);
        if (source === undefined || target === undefined) return null;
        const lane = lanes[index] ?? SINGLE_EDGE_LANE;
        const route =
          routing === "point"
            ? pointEdgeRoute(source, target, lane, nodeWidth)
            : routing === "direct"
              ? networkEdgeRoute(source, target, lane, nodeWidth, nodeHeight)
              : edgeRoute(source, target, lane, nodeWidth, nodeHeight);
        const markerId = `ekphrasis-graph-${edge.arrow}-${markerPrefix}-${index}`;
        return (
          <g
            key={`${edge.source}:${edge.target}:${edge.kind}:${index}`}
            class="ekphrasis-graph-edge"
            data-kind={edge.kind}
            data-layer={edge.layer || undefined}
            data-style={edge.style || undefined}
            data-arrow={edge.arrow}
            data-caption={edge.caption}
          >
            {edge.arrow !== "none" && (
              <defs>
                <EdgeMarker id={markerId} arrow={edge.arrow} />
              </defs>
            )}
            <path
              d={route.path}
              marker-end={edge.arrow === "none" ? undefined : `url(#${markerId})`}
            />
            {showCaptions && edge.caption === "show" && (
              <text x={route.labelX} y={route.labelY} text-anchor="middle">
                {edge.label || edge.kind}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function EdgeMarker({
  id,
  arrow,
}: {
  readonly id: string;
  readonly arrow: Exclude<DisplayEdge["arrow"], "none">;
}): JSX.Element {
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="7"
      markerHeight="7"
      orient="auto-start-reverse"
    >
      {arrow === "circle" ? (
        <circle cx="5" cy="5" r="4" />
      ) : arrow === "diamond" ? (
        <path d="M 0 5 L 5 0 L 10 5 L 5 10 z" />
      ) : (
        <path d="M 0 0 L 10 5 L 0 10 z" />
      )}
    </marker>
  );
}

interface EdgeLane {
  readonly sourceIndex: number;
  readonly sourceTotal: number;
  readonly targetIndex: number;
  readonly targetTotal: number;
  readonly pairIndex: number;
  readonly pairTotal: number;
}

const SINGLE_EDGE_LANE: EdgeLane = {
  sourceIndex: 0,
  sourceTotal: 1,
  targetIndex: 0,
  targetTotal: 1,
  pairIndex: 0,
  pairTotal: 1,
};

function edgeLanes(edges: readonly DisplayEdge[]): readonly EdgeLane[] {
  const sources = new Map<string, number[]>();
  const targets = new Map<string, number[]>();
  const pairs = new Map<string, number[]>();
  edges.forEach((edge, index) => {
    const key = `${edge.source}\u0000${edge.target}`;
    sources.set(edge.source, [...(sources.get(edge.source) ?? []), index]);
    targets.set(edge.target, [...(targets.get(edge.target) ?? []), index]);
    pairs.set(key, [...(pairs.get(key) ?? []), index]);
  });
  const lanes: EdgeLane[] = edges.map(() => ({ ...SINGLE_EDGE_LANE }));
  for (const indices of sources.values()) {
    indices.forEach((edgeIndex, laneIndex) => {
      const lane = lanes[edgeIndex] ?? SINGLE_EDGE_LANE;
      lanes[edgeIndex] = {
        ...lane,
        sourceIndex: laneIndex,
        sourceTotal: indices.length,
      };
    });
  }
  for (const indices of targets.values()) {
    indices.forEach((edgeIndex, laneIndex) => {
      const lane = lanes[edgeIndex] ?? SINGLE_EDGE_LANE;
      lanes[edgeIndex] = {
        ...lane,
        targetIndex: laneIndex,
        targetTotal: indices.length,
      };
    });
  }
  for (const indices of pairs.values()) {
    indices.forEach((edgeIndex, laneIndex) => {
      const lane = lanes[edgeIndex] ?? SINGLE_EDGE_LANE;
      lanes[edgeIndex] = {
        ...lane,
        pairIndex: laneIndex,
        pairTotal: indices.length,
      };
    });
  }
  return lanes;
}

function edgeRoute(
  source: PositionedNode,
  target: PositionedNode,
  lane: EdgeLane,
  nodeWidth: number,
  nodeHeight: number,
): { readonly path: string; readonly labelX: number; readonly labelY: number } {
  const sourceOffset = laneOffset(lane.sourceIndex, lane.sourceTotal);
  const targetOffset = laneOffset(lane.targetIndex, lane.targetTotal);
  const pairOffset = laneOffset(lane.pairIndex, lane.pairTotal);
  if (source.id === target.id) {
    const x = source.x + nodeWidth;
    const middle = source.y + nodeHeight / 2;
    const loopX = x + 52 + Math.abs(pairOffset);
    return {
      path: `M ${x} ${middle - 18} C ${loopX} ${middle - 18}, ${loopX} ${middle + 18}, ${x} ${middle + 18}`,
      labelX: loopX,
      labelY: middle - 7,
    };
  }
  const sourceCenterX = source.x + nodeWidth / 2 + sourceOffset;
  const targetCenterX = target.x + nodeWidth / 2 + targetOffset;
  if (target.y > source.y) {
    const y1 = source.y + nodeHeight;
    const y2 = target.y;
    const middle = y1 + (y2 - y1) / 2;
    return {
      path: `M ${sourceCenterX} ${y1} C ${sourceCenterX} ${middle}, ${targetCenterX} ${middle}, ${targetCenterX} ${y2}`,
      labelX: (sourceCenterX + targetCenterX) / 2 + 18,
      labelY: middle - 7,
    };
  }
  if (target.y < source.y) {
    const y1 = source.y;
    const y2 = target.y + nodeHeight;
    const routeX = Math.min(source.x, target.x) - 44 - Math.abs(pairOffset);
    return {
      path: `M ${sourceCenterX} ${y1} C ${routeX} ${y1}, ${routeX} ${y2}, ${targetCenterX} ${y2}`,
      labelX: routeX,
      labelY: y1 + (y2 - y1) / 2 - 7,
    };
  }
  const sourceMiddleY = source.y + nodeHeight / 2 + sourceOffset;
  const targetMiddleY = target.y + nodeHeight / 2 + targetOffset;
  const leftToRight = target.x > source.x;
  const x1 = leftToRight ? source.x + nodeWidth : source.x;
  const x2 = leftToRight ? target.x : target.x + nodeWidth;
  const middle = x1 + (x2 - x1) / 2;
  return {
    path: `M ${x1} ${sourceMiddleY} C ${middle} ${sourceMiddleY}, ${middle} ${targetMiddleY}, ${x2} ${targetMiddleY}`,
    labelX: middle,
    labelY: (sourceMiddleY + targetMiddleY) / 2 - 7,
  };
}

function networkEdgeRoute(
  source: PositionedNode,
  target: PositionedNode,
  lane: EdgeLane,
  nodeWidth: number,
  nodeHeight: number,
): { readonly path: string; readonly labelX: number; readonly labelY: number } {
  if (source.id === target.id) {
    return edgeRoute(source, target, lane, nodeWidth, nodeHeight);
  }
  const sourceCenter = {
    x: source.x + nodeWidth / 2,
    y: source.y + nodeHeight / 2,
  };
  const targetCenter = {
    x: target.x + nodeWidth / 2,
    y: target.y + nodeHeight / 2,
  };
  const deltaX = targetCenter.x - sourceCenter.x;
  const deltaY = targetCenter.y - sourceCenter.y;
  const distance = Math.max(1, Math.hypot(deltaX, deltaY));
  const sourceScale = Math.min(
    deltaX === 0 ? Number.POSITIVE_INFINITY : nodeWidth / 2 / Math.abs(deltaX),
    deltaY === 0 ? Number.POSITIVE_INFINITY : nodeHeight / 2 / Math.abs(deltaY),
  );
  const targetScale = sourceScale;
  const offset = laneOffset(lane.pairIndex, lane.pairTotal);
  const perpendicularX = (-deltaY / distance) * offset;
  const perpendicularY = (deltaX / distance) * offset;
  const startX = sourceCenter.x + deltaX * sourceScale + perpendicularX;
  const startY = sourceCenter.y + deltaY * sourceScale + perpendicularY;
  const endX = targetCenter.x - deltaX * targetScale + perpendicularX;
  const endY = targetCenter.y - deltaY * targetScale + perpendicularY;
  return {
    path: `M ${startX} ${startY} L ${endX} ${endY}`,
    labelX: (startX + endX) / 2 + perpendicularX,
    labelY: (startY + endY) / 2 + perpendicularY - 7,
  };
}

function pointEdgeRoute(
  source: PositionedNode,
  target: PositionedNode,
  lane: EdgeLane,
  nodeWidth: number,
): { readonly path: string; readonly labelX: number; readonly labelY: number } {
  const sourceCenter = {
    x: source.x + nodeWidth / 2,
    y: source.y + POINT_NODE_CENTER_Y,
  };
  if (source.id === target.id) {
    const loopRadius = 18 + Math.abs(laneOffset(lane.pairIndex, lane.pairTotal));
    return {
      path: `M ${sourceCenter.x + POINT_NODE_RADIUS} ${sourceCenter.y} C ${sourceCenter.x + loopRadius} ${sourceCenter.y - loopRadius}, ${sourceCenter.x - loopRadius} ${sourceCenter.y - loopRadius}, ${sourceCenter.x - POINT_NODE_RADIUS} ${sourceCenter.y}`,
      labelX: sourceCenter.x,
      labelY: sourceCenter.y - loopRadius,
    };
  }
  const targetCenter = {
    x: target.x + nodeWidth / 2,
    y: target.y + POINT_NODE_CENTER_Y,
  };
  const deltaX = targetCenter.x - sourceCenter.x;
  const deltaY = targetCenter.y - sourceCenter.y;
  const distance = Math.max(1, Math.hypot(deltaX, deltaY));
  const unitX = deltaX / distance;
  const unitY = deltaY / distance;
  const offset = laneOffset(lane.pairIndex, lane.pairTotal) / 2;
  const perpendicularX = -unitY * offset;
  const perpendicularY = unitX * offset;
  const startX = sourceCenter.x + unitX * POINT_NODE_RADIUS + perpendicularX;
  const startY = sourceCenter.y + unitY * POINT_NODE_RADIUS + perpendicularY;
  const endX = targetCenter.x - unitX * POINT_NODE_RADIUS + perpendicularX;
  const endY = targetCenter.y - unitY * POINT_NODE_RADIUS + perpendicularY;
  return {
    path: `M ${startX} ${startY} L ${endX} ${endY}`,
    labelX: (startX + endX) / 2,
    labelY: (startY + endY) / 2 - 7,
  };
}

function laneOffset(index: number, total: number): number {
  return (index - (total - 1) / 2) * 18;
}

function bounded(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function navigationDirection(key: string): GraphNavigationDirection | null {
  if (key === "ArrowUp") return "up";
  if (key === "ArrowDown") return "down";
  if (key === "ArrowLeft") return "left";
  if (key === "ArrowRight") return "right";
  return null;
}

function announcementSentence(value: string): string {
  return /[.!?]$/u.test(value) ? value : `${value}.`;
}

function readGraph(
  field: MappingField,
  overrides: Parameters<typeof readGraphPresentation>[1],
): {
  readonly presentation: GraphPresentationProfile;
  readonly nodes: readonly DisplayNode[];
  readonly edges: readonly DisplayEdge[];
} {
  const presentation = readGraphPresentation(field, overrides);
  const nodes =
    roleSequence(field, "nodes")?.items.flatMap((item) =>
      "children" in item
        ? (() => {
            const legacy = {
              field: item,
              id: roleText(item, "node-id"),
              category: roleText(item, "node-category"),
              categoryLabel: roleText(item, "node-category-label"),
              shape: roleText(item, "node-shape"),
              marker: roleText(item, "node-marker"),
              kind: roleText(item, "node-kind"),
              family: roleText(item, "node-family"),
              label: roleText(item, "node-label"),
              link: roleText(item, "node-link"),
              statusAxis: roleText(item, "node-status-axis"),
              status: roleText(item, "node-status"),
              root: roleValue(item, "node-root") === true,
              rootLabel: roleText(item, "node-root-label"),
            };
            return [
              {
                ...legacy,
                ...resolveNodePresentation(presentation, legacy),
              },
            ];
          })()
        : [],
    ) ?? [];
  const edges =
    roleSequence(field, "edges")?.items.flatMap((item) =>
      "children" in item
        ? (() => {
            const legacy = {
              field: item,
              source: roleText(item, "edge-source"),
              target: roleText(item, "edge-target"),
              kind: roleText(item, "edge-kind"),
              label: roleText(item, "edge-label"),
            };
            return [
              {
                ...legacy,
                ...resolveEdgePresentation(presentation, legacy),
              },
            ];
          })()
        : [],
    ) ?? [];
  return { presentation, nodes, edges };
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
