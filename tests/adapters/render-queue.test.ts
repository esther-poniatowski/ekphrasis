import { describe, expect, it } from "vitest";
import {
  RenderQueue,
  type BatchReport,
  type QueueEnvironment,
} from "../../src/adapters/obsidian/ui/rendering/render-queue";

/** Environment whose time advances by `cost` per job, and whose tasks run on `flush`. */
class FakeEnvironment implements QueueEnvironment {
  time = 0;
  readonly tasks: (() => void)[] = [];
  readonly observed = new Set<object>();
  changed: (target: Element, visible: boolean) => void = () => undefined;

  readonly schedule = (task: () => void): void => {
    this.tasks.push(task);
  };
  readonly now = (): number => this.time;
  readonly observer = (changed: (target: Element, visible: boolean) => void) => {
    this.changed = changed;
    return {
      observe: (target: Element) => this.observed.add(target),
      unobserve: (target: Element) => this.observed.delete(target),
      disconnect: () => this.observed.clear(),
    };
  };

  /** Runs the next scheduled task, and returns whether one was scheduled. */
  step(): boolean {
    const task = this.tasks.shift();
    task?.();
    return task !== undefined;
  }
}

function setup(batchSize = 2, budgetMs = 40, cost = 1) {
  const environment = new FakeEnvironment();
  const reports: BatchReport[] = [];
  const queue = new RenderQueue(environment, {
    batchSize,
    budgetMs,
    onBatch: (report) => reports.push(report),
  });
  const rendered: string[] = [];
  const released: string[] = [];
  const request = (name: string): { target: Element; cancel: () => void } => {
    const target = { name } as unknown as Element;
    const cancel = queue.request(target, () => {
      environment.time += cost;
      rendered.push(name);
      return () => released.push(name);
    });
    return { target, cancel };
  };
  return { environment, queue, reports, rendered, released, request };
}

describe("queue of rendered values", () => {
  it("renders nothing at the request, then in batches separated by a yield", () => {
    const { environment, rendered, reports, request } = setup();
    ["a", "b", "c"].forEach((name) => request(name));
    expect(rendered).toEqual([]);
    expect(environment.step()).toBe(true);
    expect(rendered).toEqual(["a", "b"]);
    expect(environment.step()).toBe(true);
    expect(rendered).toEqual(["a", "b", "c"]);
    expect(environment.step()).toBe(false);
    expect(reports.map(({ jobs, pending }) => [jobs, pending])).toEqual([
      [2, 1],
      [1, 0],
    ]);
  });

  it("renders the visible values first, in the order of their requests", () => {
    const { environment, rendered, request } = setup(2);
    const [a, , c, d] = ["a", "b", "c", "d"].map((name) => request(name));
    environment.changed(d?.target as Element, true);
    environment.changed(c?.target as Element, true);
    environment.changed(a?.target as Element, false);
    environment.step();
    expect(rendered).toEqual(["c", "d"]);
  });

  it("ends a batch once its budget of time has elapsed, after one job at least", () => {
    const { environment, rendered, request } = setup(15, 40, 25);
    ["a", "b", "c", "d"].forEach((name) => request(name));
    environment.step();
    expect(rendered).toEqual(["a", "b"]);
  });

  it("drops a cancelled pending job, and releases a rendering once it has run", () => {
    const { environment, rendered, released, request, queue } = setup();
    const a = request("a");
    const b = request("b");
    b.cancel();
    expect(queue.size).toBe(1);
    environment.step();
    expect(rendered).toEqual(["a"]);
    a.cancel();
    expect(released).toEqual(["a"]);
    expect(environment.observed.size).toBe(0);
  });
});
