/**
 * Spike on rendering time: renders one hundred Markdown values and one hundred formulas in one
 * view, each in a Preact component that hands its container to a renderer of Obsidian, and
 * measures the time of each stage.
 *
 * Decision record: field rendering (`docs/adr/field-rendering.md`).
 */
import {
  Component,
  finishRenderMath,
  ItemView,
  loadMathJax,
  MarkdownRenderer,
  renderMath,
  type App,
  type Plugin,
  type WorkspaceLeaf,
} from "obsidian";
import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { ms, showReport } from "./report";
import type { Spike } from "./spike";

const VIEW_TYPE = "ekphrasis-spikes-rendering";
const FIELD_COUNT = 100;

const markdownValue = (index: number): string =>
  `**Field ${index}**: a value with *emphasis*, inline math $x_{${index}}^2$, a link to ` +
  `[[note ${index}]], and \`code\`.\n\n- first item\n- second item`;

const formulaValue = (index: number): string =>
  `\\ddot{\\theta}_{${index}} + \\gamma \\dot{\\theta} + \\omega_0^2 \\sin\\theta = ` +
  `\\frac{F}{m \\ell^2} \\cos(\\Omega t + ${index})`;

interface RenderingContext {
  readonly app: App;
  readonly owner: Component;
  readonly sourcePath: string;
}

/** Renders Markdown through Obsidian into its container, and unloads the rendering on unmount. */
function MarkdownField(props: {
  context: RenderingContext;
  markdown: string;
  onRendered: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const { app, owner, sourcePath } = props.context;
    const child = owner.addChild(new Component());
    void MarkdownRenderer.render(app, props.markdown, element, sourcePath, child).then(
      props.onRendered,
    );
    return () => owner.removeChild(child);
  }, [props.markdown]);
  return <div class="ekphrasis-spike-field" ref={container} />;
}

/** Renders a display formula through MathJax into its container. */
function FormulaField(props: { source: string }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    element.replaceChildren(renderMath(props.source, true));
  }, [props.source]);
  return <div class="ekphrasis-spike-field" ref={container} />;
}

/** Timestamps of one run, in milliseconds since the start of the run. */
interface Timings {
  mathJaxLoaded?: number;
  mounted?: number;
  markdownRendered?: number;
  mathFlushed?: number;
  painted?: number;
}

function Bench(props: { context: RenderingContext; run: number; onDone: (t: Timings) => void }) {
  const [start] = useState(() => performance.now());
  const [mathReady, setMathReady] = useState(false);
  const timings = useRef<Timings>({});
  const pending = useRef(FIELD_COUNT);
  const elapsed = (): number => performance.now() - start;

  useEffect(() => {
    void loadMathJax().then(() => {
      timings.current.mathJaxLoaded = elapsed();
      setMathReady(true);
    });
  }, []);

  useEffect(() => {
    if (!mathReady) return;
    timings.current.mounted = elapsed();
    void finishRenderMath().then(() => {
      timings.current.mathFlushed = elapsed();
    });
  }, [mathReady]);

  const onRendered = (): void => {
    pending.current -= 1;
    if (pending.current > 0) return;
    timings.current.markdownRendered = elapsed();
    requestAnimationFrame(() => {
      timings.current.painted = elapsed();
      props.onDone(timings.current);
    });
  };

  if (!mathReady) return <p>Loading MathJax…</p>;
  const indices = Array.from({ length: FIELD_COUNT }, (_, index) => index);
  return (
    <div>
      <h3>Run {props.run}</h3>
      {indices.map((index) => (
        <MarkdownField
          key={`md-${index}`}
          context={props.context}
          markdown={markdownValue(index)}
          onRendered={onRendered}
        />
      ))}
      {indices.map((index) => (
        <FormulaField key={`tex-${index}`} source={formulaValue(index)} />
      ))}
    </div>
  );
}

/** Duration beyond which a task blocks input, as the Long Tasks API of the browser defines it. */
const LONG_TASK_MS = 50;

/**
 * Records the long tasks of the main thread during one run. A long task delays every input event
 * that arrives during it, so the longest task bounds the freeze that a user can perceive.
 */
class LongTaskRecorder {
  readonly #durations: number[] = [];
  readonly #observer: PerformanceObserver | null;

  constructor() {
    const supported = PerformanceObserver.supportedEntryTypes.includes("longtask");
    this.#observer = supported
      ? new PerformanceObserver((list) => this.#collect(list.getEntries()))
      : null;
    this.#observer?.observe({ type: "longtask", buffered: false });
  }

  /** Stops recording, and describes the long tasks of the run. */
  stop(): string[] {
    if (!this.#observer) return ["  - Long tasks: unavailable (Long Tasks API not supported)"];
    this.#collect(this.#observer.takeRecords());
    this.#observer.disconnect();
    const longest = Math.max(0, ...this.#durations);
    const blocking = this.#durations.reduce((sum, d) => sum + Math.max(0, d - LONG_TASK_MS), 0);
    return [
      `  - Long tasks (over ${LONG_TASK_MS} ms): ${this.#durations.length}`,
      `  - Longest task: ${ms(longest)}`,
      `  - Total blocking time (beyond ${LONG_TASK_MS} ms per task): ${ms(blocking)}`,
    ];
  }

  #collect(entries: readonly PerformanceEntry[]): void {
    for (const entry of entries) this.#durations.push(entry.duration);
  }
}

const describeTimings = (run: number, t: Timings): string[] => [
  `- Run ${run}: ${FIELD_COUNT} Markdown values and ${FIELD_COUNT} formulas.`,
  `  - MathJax loaded: ${ms(t.mathJaxLoaded ?? NaN)}`,
  `  - Components mounted, formulas rendered: ${ms(t.mounted ?? NaN)}`,
  `  - Every Markdown value rendered: ${ms(t.markdownRendered ?? NaN)}`,
  `  - MathJax stylesheet flushed: ${ms(t.mathFlushed ?? NaN)}`,
  `  - First frame painted after rendering: ${ms(t.painted ?? NaN)}`,
];

class RenderingView extends ItemView {
  #run = 0;
  readonly #results: string[] = [];

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  override getViewType(): string {
    return VIEW_TYPE;
  }

  override getDisplayText(): string {
    return "Rendering spike";
  }

  override onOpen(): Promise<void> {
    this.addAction("refresh-cw", "Run again", () => this.#start());
    this.#start();
    return Promise.resolve();
  }

  override onClose(): Promise<void> {
    render(null, this.contentEl);
    return Promise.resolve();
  }

  #start(): void {
    this.#run += 1;
    const run = this.#run;
    const context = { app: this.app, owner: this, sourcePath: "" };
    render(null, this.contentEl);
    const longTasks = new LongTaskRecorder();
    render(
      <Bench
        key={run}
        context={context}
        run={run}
        onDone={(timings) => {
          this.#results.push(...describeTimings(run, timings), ...longTasks.stop());
          showReport(this.app, { title: "Rendering time", lines: this.#results });
        }}
      />,
      this.contentEl,
    );
  }
}

export const renderingTimeSpike: Spike = {
  register(plugin: Plugin) {
    plugin.registerView(VIEW_TYPE, (leaf) => new RenderingView(leaf));
    plugin.addCommand({
      id: "measure-rendering-time",
      name: "Rendering: open the view of 100 Markdown values and 100 formulas",
      callback: () => {
        void plugin.app.workspace.getLeaf("tab").setViewState({ type: VIEW_TYPE, active: true });
      },
    });
  },
};
