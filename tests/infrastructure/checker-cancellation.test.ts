/**
 * Stop of the process tree of a checker command, measured on the runner of a validation. When the
 * runner stops while a call of the built-in findings route runs, the command started by that call
 * and the descendant started by the command stop with it. Three triggers are covered: a timeout,
 * the command *Restart Python checkers*, and a forced close. After each stop, a later call starts
 * a fresh runner and succeeds. A runner without pending work still closes through the end of its
 * standard input, so that Python exits normally.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { FINDINGS_LOG_CHECKER } from "../../src/application";
import { PythonCheckerProcess } from "../../src/infrastructure";
import { writeCheckerPackages } from "../support/checker-package";

const interpreter = process.env["PYTHON"] ?? "python3";
const root = mkdtempSync(join(tmpdir(), "ekphrasis-cancel-"));
writeCheckerPackages(root);
mkdirSync(join(root, "inquiry"));
const record = join(root, "inquiry", "record.yml");
const exitMarker = join(root, "exited");
writeFileSync(
  join(root, "exitmark.py"),
  [
    "import atexit",
    "import os",
    "",
    "def _mark():",
    "    with open(os.path.join(os.path.dirname(__file__), 'exited'), 'w') as handle:",
    "        handle.write('exited')",
    "",
    "atexit.register(_mark)",
    "",
    "def idle(value, **context):",
    "    return []",
    "",
  ].join("\n"),
);

/** Process identifiers started by the tests, stopped after them whatever their outcome. */
const started: number[] = [];

afterAll(() => {
  for (const pid of started) if (isAlive(pid)) process.kill(pid, "SIGKILL");
  rmSync(join(root, "lockedpkg"), { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitFor(condition: () => boolean, limitMs: number): Promise<void> {
  const begun = Date.now();
  while (!condition() && Date.now() - begun < limitMs) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

function newRunner(timeoutMs: number): PythonCheckerProcess {
  return new PythonCheckerProcess(
    interpreter,
    [
      { name: "findings", ...FINDINGS_LOG_CHECKER },
      { name: "idle", module: join(root, "exitmark.py"), function: "idle" },
    ],
    timeoutMs,
  );
}

/** Call of the findings route running `python -m fakechk <mode>` from the temporary root. */
function findings(runner: PythonCheckerProcess, mode: string, value = ""): Promise<unknown> {
  return runner.call({
    checker: "findings",
    value: {},
    instance: {},
    path: "",
    file: record,
    arguments: { command: ["-m", "fakechk", mode, "{folder}", value], root },
  });
}

/**
 * Starts a call whose command starts a descendant, and returns the pending call with the process
 * identifiers of the command and of its descendant, once both are running.
 */
async function startTree(
  runner: PythonCheckerProcess,
  name: string,
): Promise<{ readonly call: Promise<unknown>; readonly pids: readonly number[] }> {
  const pidFile = join(root, `${name}.pid`);
  const call = findings(runner, "tree", pidFile);
  call.catch(() => undefined);
  await waitFor(() => existsSync(pidFile), 5000);
  const pids = readFileSync(pidFile, "utf8").split(" ").map(Number);
  started.push(...pids);
  expect(pids).toHaveLength(2);
  expect(pids.filter((pid) => !isAlive(pid))).toEqual([]);
  return { call, pids };
}

/** Asserts that every process of `pids` stops within a bound left for the system to reap it. */
async function expectStopped(pids: readonly number[]): Promise<void> {
  await waitFor(() => !pids.some(isAlive), 5000);
  expect(pids.filter(isAlive)).toEqual([]);
}

/** Asserts that a later call starts a fresh runner and returns the issue of the log. */
async function expectRecovery(runner: PythonCheckerProcess): Promise<void> {
  await expect(findings(runner, "ok")).resolves.toEqual([
    expect.objectContaining({ message: "The title is wrong.", pointer: "/title" }),
  ]);
}

describe("the stop of a checker command with its runner", () => {
  it("stops the command and its descendant when a call exceeds the timeout", async () => {
    const runner = newRunner(4000);
    try {
      const { call, pids } = await startTree(runner, "timeout");
      await expect(call).rejects.toThrow(/exceeded its 4000 ms timeout/);
      await expectStopped(pids);
      await expectRecovery(runner);
    } finally {
      await runner.close();
    }
  }, 20_000);

  it("stops the command and its descendant when the checkers restart during a call", async () => {
    const runner = newRunner(60_000);
    try {
      const { call, pids } = await startTree(runner, "restart");
      await runner.restart();
      await expect(call).rejects.toThrow(/Python checker process restarted/);
      await expectStopped(pids);
      await expectRecovery(runner);
    } finally {
      await runner.close();
    }
  }, 20_000);

  it("stops the command and its descendant when the runner closes during a call", async () => {
    const runner = newRunner(60_000);
    try {
      const { call, pids } = await startTree(runner, "close");
      await runner.close();
      await expect(call).rejects.toThrow(/Python checker process closed/);
      await expectStopped(pids);
      await expectRecovery(runner);
    } finally {
      await runner.close();
    }
  }, 20_000);

  it("closes a runner without pending work through the end of its standard input", async () => {
    const runner = newRunner(60_000);
    await expect(
      runner.call({
        checker: "idle",
        value: null,
        instance: {},
        path: "",
        file: record,
        arguments: {},
      }),
    ).resolves.toEqual([]);
    await runner.close();
    expect(existsSync(exitMarker)).toBe(true);
  }, 20_000);
});
