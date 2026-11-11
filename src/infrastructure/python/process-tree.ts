/**
 * Stop of a process together with every process that it started. A forced stop of the checker
 * runner must also stop the command started by a call of the findings route, and the descendants
 * of that command. The runner itself cannot be relied on to stop them, for two reasons: a runner
 * blocked in a call reads no message, and neither `SIGKILL` nor a termination on Windows can be
 * intercepted by the stopped process.
 *
 * On macOS and Linux, the runner starts as the leader of a new process group, which its command
 * and the descendants of that command inherit. The stop sends `SIGKILL` to the whole group. On
 * Windows, the stop runs `taskkill /t /f` on the runner, which terminates every process whose
 * chain of parent processes leads to the runner. Both operations take their arguments as a list,
 * so no shell interprets them.
 */
import type { ChildProcess } from "node:child_process";

/** Option of `spawn` that makes the started process the root of a tree that `stopTree` stops. */
export function treeRootOptions(platform: NodeJS.Platform = process.platform): {
  readonly detached: boolean;
} {
  return { detached: platform !== "win32" };
}

/** Operation that stops the tree rooted at a process started with `treeRootOptions`. */
export type TreeStop =
  | { readonly kind: "signal-group"; readonly group: number; readonly signal: "SIGKILL" }
  | { readonly kind: "run"; readonly file: string; readonly args: readonly string[] };

/** Operation that stops the tree rooted at the process `pid` on `platform`. */
export function treeStop(pid: number, platform: NodeJS.Platform = process.platform): TreeStop {
  return platform === "win32"
    ? { kind: "run", file: "taskkill", args: ["/pid", String(pid), "/t", "/f"] }
    : { kind: "signal-group", group: -pid, signal: "SIGKILL" };
}

/**
 * Stops `child`, started with `treeRootOptions`, and every process of its tree. When the tree
 * operation cannot run, `child` alone is stopped, so that the stop of the runner never fails.
 */
export function stopTree(child: ChildProcess): void {
  const pid = child.pid;
  if (pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
  const stop = treeStop(pid);
  if (stop.kind === "signal-group") {
    try {
      process.kill(stop.group, stop.signal);
    } catch {
      child.kill("SIGKILL");
    }
    return;
  }
  void import("node:child_process")
    .then(({ spawn }) => {
      const killer = spawn(stop.file, stop.args, { stdio: "ignore", windowsHide: true });
      killer.on("error", () => child.kill());
    })
    .catch(() => child.kill());
}
