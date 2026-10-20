/**
 * Scheduling of the rendered values of a form, as the decision on field rendering requires: the
 * values in the visible area render first, in batches separated by a yield to input, so that no
 * batch blocks typing or scrolling for long.
 *
 * Each rendered value requests a job of rendering for its element. A batch runs the pending jobs
 * of the visible elements first, in the order of their requests, then the other jobs. A batch
 * ends after `batchSize` jobs, or once `budgetMs` milliseconds have elapsed, whichever comes
 * first, so a batch of long values stays short. The next batch then waits for the next turn of
 * the event loop, where pending input runs first.
 */

/** Job rendering a value, returning the function that releases its rendering. */
export type RenderJob = () => () => void;

export interface RenderScheduler {
  /**
   * Requests the rendering of the element `target` by `job`, and returns the function that
   * cancels the job when it is pending, and releases its rendering once it has run.
   */
  request(target: Element, job: RenderJob): () => void;
}

/** Scheduler running each job at its request, for component tests. */
export const IMMEDIATE_SCHEDULER: RenderScheduler = {
  request(_target, job) {
    return job();
  },
};

/** Observer of the visibility of the requested elements. */
export interface VisibilityObserver {
  observe(target: Element): void;
  unobserve(target: Element): void;
  disconnect(): void;
}

/** Host functions of the queue, injected so that tests control time and visibility. */
export interface QueueEnvironment {
  /** Runs `task` after a yield to input, at a later turn of the event loop. */
  readonly schedule: (task: () => void) => void;
  /** Current time, in milliseconds. */
  readonly now: () => number;
  /** Creates an observer reporting each change of visibility of an observed element. */
  readonly observer: (changed: (target: Element, visible: boolean) => void) => VisibilityObserver;
}

/** Duration and size of a batch, reported after it runs. */
export interface BatchReport {
  readonly jobs: number;
  readonly durationMs: number;
  readonly pending: number;
}

export interface QueueOptions {
  readonly batchSize: number;
  readonly budgetMs: number;
  /** Called after each batch, for instance to report a batch longer than intended. */
  readonly onBatch?: (report: BatchReport) => void;
}

/**
 * Default size of a batch: the spike on rendering time measured 2 to 3 ms per value, so about
 * fifteen values keep a batch under 50 ms, the duration beyond which a task blocks input.
 */
export const DEFAULT_QUEUE_OPTIONS: QueueOptions = { batchSize: 15, budgetMs: 40 };

interface Pending {
  readonly job: RenderJob;
  visible: boolean;
}

export class RenderQueue implements RenderScheduler {
  private readonly pending = new Map<Element, Pending>();
  private readonly observer: VisibilityObserver;
  private scheduled = false;

  constructor(
    private readonly environment: QueueEnvironment,
    private readonly options: QueueOptions = DEFAULT_QUEUE_OPTIONS,
  ) {
    this.observer = environment.observer((target, visible) => {
      const entry = this.pending.get(target);
      if (entry !== undefined) entry.visible = visible;
    });
  }

  request(target: Element, job: RenderJob): () => void {
    const rendering: { release: (() => void) | null } = { release: null };
    const wrapped: RenderJob = () => {
      rendering.release = job();
      return rendering.release;
    };
    this.pending.set(target, { job: wrapped, visible: false });
    this.observer.observe(target);
    this.scheduleBatch();
    return () => {
      if (this.pending.get(target)?.job === wrapped) this.forget(target);
      rendering.release?.();
      rendering.release = null;
    };
  }

  /** Stops observing the elements, and drops the pending jobs. */
  dispose(): void {
    this.pending.clear();
    this.observer.disconnect();
  }

  /** Number of jobs waiting for a batch. */
  get size(): number {
    return this.pending.size;
  }

  private scheduleBatch(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    this.environment.schedule(() => {
      this.scheduled = false;
      this.runBatch();
    });
  }

  private runBatch(): void {
    const start = this.environment.now();
    const order = [...this.pending].sort(([, a], [, b]) => Number(b.visible) - Number(a.visible));
    let jobs = 0;
    for (const [target, entry] of order) {
      if (jobs >= this.options.batchSize) break;
      if (jobs > 0 && this.environment.now() - start >= this.options.budgetMs) break;
      this.forget(target);
      entry.job();
      jobs += 1;
    }
    this.options.onBatch?.({
      jobs,
      durationMs: this.environment.now() - start,
      pending: this.pending.size,
    });
    if (this.pending.size > 0) this.scheduleBatch();
  }

  private forget(target: Element): void {
    this.pending.delete(target);
    this.observer.unobserve(target);
  }
}

/**
 * Environment of the queue in a browser window: a timeout of zero yields to input, and an
 * intersection observer on the scrolling element `root` reports the visible elements.
 */
export function windowEnvironment(root: Element | null): QueueEnvironment {
  return {
    schedule: (task) => window.setTimeout(task, 0),
    now: () => performance.now(),
    observer: (changed) => {
      const observer = new IntersectionObserver(
        (entries) => entries.forEach((entry) => changed(entry.target, entry.isIntersecting)),
        { root },
      );
      return {
        observe: (target) => observer.observe(target),
        unobserve: (target) => observer.unobserve(target),
        disconnect: () => observer.disconnect(),
      };
    },
  };
}
