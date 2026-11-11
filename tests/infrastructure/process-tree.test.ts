/**
 * Operation that stops the process tree of the checker runner on each desktop platform. The
 * operation on macOS and Linux runs in the tests of cancellation; the operation on Windows is
 * verified here by its arguments only, since it runs on Windows alone.
 */
import { describe, expect, it } from "vitest";
import { treeRootOptions, treeStop } from "../../src/infrastructure/python/process-tree";

describe("the stop of a process tree", () => {
  it.each(["darwin", "linux"] as const)(
    "starts the root as a group leader and kills the group on %s",
    (platform) => {
      expect(treeRootOptions(platform)).toEqual({ detached: true });
      expect(treeStop(4321, platform)).toEqual({
        kind: "signal-group",
        group: -4321,
        signal: "SIGKILL",
      });
    },
  );

  it("starts the root attached and runs taskkill on its tree on Windows", () => {
    expect(treeRootOptions("win32")).toEqual({ detached: false });
    expect(treeStop(4321, "win32")).toEqual({
      kind: "run",
      file: "taskkill",
      args: ["/pid", "4321", "/t", "/f"],
    });
  });
});
