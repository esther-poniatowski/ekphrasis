/**
 * Tests of the Python probe of the setup diagnostic, run with a real interpreter on the packages
 * of the test support: each failure of the route reaches the port as a distinct outcome, and no
 * request writes a file, a bytecode cache included.
 */
import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { PythonSetupProbe } from "../../src/infrastructure";
import { runsAsRoot, writeCheckerPackages } from "../support/checker-package";

const interpreter = process.env["PYTHON"] ?? "python3";
const root = mkdtempSync(join(tmpdir(), "ekphrasis-probe-"));
writeCheckerPackages(root);
mkdirSync(join(root, "inquiry"));
const record = join(root, "inquiry", "record.yml");
writeFileSync(join(root, "plain.txt"), "not executable\n");
const probe = new PythonSetupProbe({ ...process.env, PYTHONPATH: root });

afterAll(() => {
  chmodSync(join(root, "lockedpkg", "data", "rules.yml"), 0o644);
  rmSync(root, { recursive: true, force: true });
});

/** Path, size and digest of every file below `folder`, to show that nothing was written. */
function snapshot(folder: string): string[] {
  const entries: string[] = [];
  const visit = (path: string): void => {
    for (const name of readdirSync(path).sort()) {
      const child = join(path, name);
      const stats = statSync(child);
      if (stats.isDirectory()) {
        entries.push(`${child}/`);
        visit(child);
      } else if (stats.mode & 0o444) {
        entries.push(`${child} ${createHash("sha256").update(readFileSync(child)).digest("hex")}`);
      } else {
        entries.push(`${child} ${stats.size} ${stats.mtimeMs}`);
      }
    }
  };
  visit(folder);
  return entries;
}

function answered<T>(outcome: { status: string; result?: T }): T {
  expect(outcome.status).toBe("answered");
  return outcome.result as T;
}

describe("the Python probe of the setup diagnostic", () => {
  it("classifies the file named as the interpreter", async () => {
    await expect(probe.inspectInterpreter(join(root, "absent", "python"))).resolves.toEqual({
      status: "missing",
    });
    await expect(probe.inspectInterpreter(root)).resolves.toEqual({ status: "not-file" });
    await expect(probe.inspectInterpreter(join(root, "plain.txt"))).resolves.toEqual({
      status: "not-executable",
      reason: "EACCES",
    });
  });

  it("reports the version of a started interpreter, and a launch failure by its system error", async () => {
    const environment = answered(await probe.environment(interpreter));
    expect(environment.version).toMatch(/^3\.\d+/);
    const absent = await probe.environment(join(root, "absent", "python"));
    expect(absent).toMatchObject({ status: "launch-failed", code: "ENOENT" });
  });

  it("reports a program that starts but is no Python interpreter", async () => {
    const outcome = await probe.environment("/bin/echo");
    expect(outcome.status).toBe("invalid-response");
  });

  it("imports modules and locates the module of a command without running it", async () => {
    const results = answered(
      await probe.imports(interpreter, null, [
        { kind: "entry", module: "fakechk" },
        { kind: "entry", module: "absent_package" },
        { kind: "module", module: "json", attribute: "dumps" },
        { kind: "module", module: "json", attribute: "absent" },
        { kind: "script", path: join(root, "absent.py") },
      ]),
    );
    expect(results.map(({ error }) => error?.split(":")[0] ?? null)).toEqual([
      null,
      "ModuleNotFoundError",
      null,
      "AttributeError",
      "FileNotFoundError",
    ]);
    expect(results[0]?.origin).toContain(join("fakechk", "__init__.py"));
  });

  it("reads every data file of a package, and names those that cannot be read", async () => {
    const fake = answered(await probe.packageData(interpreter, null, "fakechk"));
    expect(fake).toMatchObject({ readable: 1, unreadable: [] });
    const locked = answered(await probe.packageData(interpreter, null, "lockedpkg"));
    if (runsAsRoot()) return;
    expect(locked.readable).toBe(0);
    expect(locked.unreadable).toHaveLength(1);
    expect(locked.unreadable[0]?.path).toContain(join("lockedpkg", "data", "rules.yml"));
    expect(locked.unreadable[0]?.error).toContain("PermissionError");
  });

  describe("one run of a configured command", () => {
    const run = (mode: string, value?: string, capMs = 30_000) =>
      probe.runCommand(interpreter, {
        command: ["-m", "fakechk", mode, "{folder}", ...(value === undefined ? [] : [value])],
        root: "{folder}",
        file: record,
        capMs,
      });

    it("converts a valid log into the issues of the checked file, as a validation does", async () => {
      const result = answered(await run("ok"));
      expect(result).toMatchObject({ timedOut: false, exitCode: 0 });
      expect(result.report).toMatchObject({
        kind: "sarif",
        runs: 1,
        results: 1,
        defects: [],
        conversionError: null,
        issues: [
          {
            message: "The title is wrong.",
            severity: "error",
            pointer: "/title",
            rule: "fake.rule",
          },
        ],
      });
    });

    it("distinguishes an empty, a textual and a non-SARIF output", async () => {
      const empty = answered(await run("empty"));
      expect(empty).toMatchObject({ exitCode: 2, report: { kind: "empty" } });
      expect(empty.stderr).toContain("the folder holds no inquiry");
      expect(answered(await run("text")).report).toEqual({
        kind: "invalid-json",
        excerpt: "checked 1 file",
      });
      expect(answered(await run("not-sarif")).report).toMatchObject({ kind: "not-sarif" });
    });

    it("names the fields that a result lacks for the issue transport", async () => {
      const report = answered(await run("defects")).report;
      expect(report).toMatchObject({
        kind: "sarif",
        defects: [
          {
            index: 0,
            missing: ["message.text", "locations[0].physicalLocation.artifactLocation.uri"],
          },
        ],
      });
    });

    it("measures the duration once, and stops a command that exceeds its bound", async () => {
      const slow = answered(await run("sleep", "0.3"));
      expect(slow.durationMs).toBeGreaterThanOrEqual(300);
      const stopped = answered(await run("sleep", "5", 500));
      expect(stopped.timedOut).toBe(true);
      expect(stopped.durationMs).toBeLessThan(4000);
    });
  });

  it("calls a registered function once, and rejects a value other than a list of issues", async () => {
    const module = join(root, "checks.py");
    writeFileSync(
      module,
      "def good(value, **context):\n    return ['checked']\n\ndef bad(value, **context):\n    return {'message': 'x'}\n",
    );
    const call = {
      checker: "good",
      value: {},
      instance: {},
      path: "",
      file: record,
      arguments: {},
    };
    const good = answered(
      await probe.callChecker(
        interpreter,
        { name: "good", module, function: "good" },
        call,
        10_000,
      ),
    );
    expect(good.issues).toEqual(["checked"]);
    const bad = await probe.callChecker(
      interpreter,
      { name: "bad", module, function: "bad" },
      { ...call, checker: "bad" },
      10_000,
    );
    expect(bad.status).toBe("failed");
    expect(bad.status === "failed" ? bad.error : "").toContain("list of issues");
    rmSync(module);
  });

  it("writes no file, and no bytecode cache, while answering", async () => {
    const before = snapshot(root);
    await probe.imports(interpreter, null, [{ kind: "entry", module: "fakechk" }]);
    await probe.packageData(interpreter, null, "fakechk");
    await probe.runCommand(interpreter, {
      command: ["-m", "fakechk", "ok", "{folder}"],
      root: root,
      file: join(root, "record.yml"),
      capMs: 30_000,
    });
    expect(snapshot(root)).toEqual(before);
  });
});
