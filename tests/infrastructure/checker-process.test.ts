import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  CheckerProcessError,
  PythonCheckerProcess,
} from "../../src/infrastructure/python/checker-process";

const root = mkdtempSync(join(tmpdir(), "ekphrasis-checkers-"));
const modulePath = join(root, "checks.py");
writeFileSync(
  modulePath,
  [
    "import os",
    "import time",
    "",
    "def report(value, *, instance, path, file, prefix=''):",
    "    return [",
    "        prefix + str(value),",
    "        {",
    "            'message': instance['message'],",
    "            'path': path,",
    "            'severity': 'warning',",
    "            'discriminator': file,",
    "        },",
    "    ]",
    "",
    "def fail(value, **context):",
    "    raise ValueError('rejected ' + str(value))",
    "",
    "def invalid(value, **context):",
    "    return {'message': 'not a list'}",
    "",
    "def process_id(value, **context):",
    "    return [str(os.getpid())]",
    "",
    "def slow(value, **context):",
    "    time.sleep(float(value))",
    "    return ['finished']",
    "",
  ].join("\n"),
);

const interpreter = process.env["PYTHON"] ?? "python3";
const runner = new PythonCheckerProcess(
  interpreter,
  [
    { name: "report", module: modulePath, function: "report" },
    { name: "fail", module: modulePath, function: "fail" },
    { name: "invalid", module: modulePath, function: "invalid" },
    { name: "process-id", module: modulePath, function: "process_id" },
    { name: "slow", module: modulePath, function: "slow" },
  ],
  1000,
);

afterAll(async () => {
  await runner.close();
  rmSync(root, { recursive: true, force: true });
});

function call(checker: string, value = "result") {
  return runner.call({
    checker,
    value,
    instance: { message: "Located issue" },
    path: "subject.target",
    file: "/vault/problem/question.yml",
    arguments: { prefix: "checked: " },
  });
}

describe("persistent Python checker process", () => {
  it("registers a function and returns string and located issues", async () => {
    await expect(call("report")).resolves.toEqual([
      "checked: result",
      {
        message: "Located issue",
        path: "subject.target",
        severity: "warning",
        discriminator: "/vault/problem/question.yml",
      },
    ]);
  });

  it("uses the same process for later calls", async () => {
    await expect(call("report", "second")).resolves.toEqual([
      "checked: second",
      expect.objectContaining({ message: "Located issue" }),
    ]);
  });

  it("reports a checker exception without stopping the process", async () => {
    await expect(call("fail", "claim")).rejects.toThrow("ValueError: rejected claim");
    await expect(call("report", "after error")).resolves.toEqual([
      "checked: after error",
      expect.objectContaining({ message: "Located issue" }),
    ]);
  });

  it("refuses a function that was not registered", async () => {
    await expect(call("unknown")).rejects.toThrow("checker is not registered: unknown");
  });

  it("rejects a malformed checker result at the process boundary", async () => {
    await expect(call("invalid")).rejects.toThrow(
      "Custom checker returned a value other than a list of issues",
    );
  });

  it("closes the runner and starts a fresh process on the next call", async () => {
    await runner.close();
    await expect(call("report", "restarted")).resolves.toEqual([
      "checked: restarted",
      expect.objectContaining({ message: "Located issue" }),
    ]);
  });

  it("restarts the runner and imports the checkers in a fresh process", async () => {
    const [before] = await call("process-id");
    await runner.restart();
    const [after] = await call("process-id");

    expect(after).not.toBe(before);
  });

  it("stops a timed-out process before a later call starts a fresh process", async () => {
    const impatient = new PythonCheckerProcess(
      interpreter,
      [
        { name: "report", module: modulePath, function: "report" },
        { name: "slow", module: modulePath, function: "slow" },
      ],
      50,
    );

    await expect(
      impatient.call({
        checker: "slow",
        value: "0.2",
        instance: {},
        path: "claim",
        file: "/vault/record.yml",
        arguments: {},
      }),
    ).rejects.toThrow("Custom checker `slow` exceeded its 50 ms timeout");
    await expect(
      impatient.call({
        checker: "report",
        value: "after timeout",
        instance: { message: "Located issue" },
        path: "claim",
        file: "/vault/record.yml",
        arguments: {},
      }),
    ).resolves.toEqual(["after timeout", expect.objectContaining({ message: "Located issue" })]);
    await impatient.close();
  });

  it("names the configured interpreter when startup fails", async () => {
    const absent = new PythonCheckerProcess(join(root, "missing-python"), [], 1000);
    await expect(
      absent.call({
        checker: "none",
        value: null,
        instance: {},
        path: "",
        file: "/vault/record.yml",
        arguments: {},
      }),
    ).rejects.toBeInstanceOf(CheckerProcessError);
    await expect(
      absent.call({
        checker: "none",
        value: null,
        instance: {},
        path: "",
        file: "/vault/record.yml",
        arguments: {},
      }),
    ).rejects.toThrow(join(root, "missing-python"));
  });
});

describe("built-in findings log checker", () => {
  const folder = join(root, "inquiry");
  const record = join(folder, "record.yml");
  const toolPath = join(root, "tool.py");
  const silentPath = join(root, "silent.py");
  mkdirSync(folder, { recursive: true });
  writeFileSync(record, "id: rec.a\n");
  writeFileSync(
    toolPath,
    [
      "import json",
      "import sys",
      "",
      "def located(uri, name):",
      "    return [{",
      "        'physicalLocation': {'artifactLocation': {'uri': uri, 'uriBaseId': 'SRCROOT'}},",
      "        'logicalLocations': [{'name': name}],",
      "    }]",
      "",
      "log = {'version': '2.1.0', 'runs': [{",
      "    'tool': {'driver': {'name': 'tool', 'rules': []}},",
      "    'properties': {'tool/validationContext': [{",
      "        'label': 'Completion target', 'value': 'question-typed',",
      "        'description': 'Checks completion through the typed question.',",
      "        'resultClass': 'computed inquiry diagnosis',",
      "        'documentationTarget': 'docs/scopes.md#question-typed'}, {",
      "        'label': 'Clean result',",
      "        'value': 'structural and method conformance only',",
      "        'description': 'The check establishes no truth, warrant or acceptance.',",
      "        'documentationTarget': 'docs/results.md'}]},",
      "    'invocations': [{'executionSuccessful': False, 'toolExecutionNotifications': [",
      "        {'level': 'error', 'message': {'text': 'a record could not be read'}}]}],",
      "    'results': [",
      "        {'ruleId': 'area/unresolved', 'level': 'error',",
      "         'message': {'text': 'laws.expression -> zz'},",
      "         'locations': located('record.yml', 'id:rec.a#/laws'),",
      "         'partialFingerprints': {'discriminator/v1': 'f/expression/zz'},",
      "         'properties': {'tool/resultClass': 'method-conformance finding',",
      "                        'tool/controllingDecision': '/title',",
      "                        'repairCondition': 'Every identifier resolves.',",
      "                        'documentationTarget': 'docs/rules.md'}},",
      "        {'ruleId': 'area/term', 'level': 'note', 'message': {'text': 'Typed'},",
      "         'locations': located('record.yml', 'id:rec.a#term:glossary')},",
      "        {'ruleId': 'area/other', 'level': 'error', 'message': {'text': 'Elsewhere'},",
      "         'locations': located('other.yml', 'id:rec.b')},",
      "    ],",
      "}]}",
      "assert sys.argv[1] == '" + folder.replace(/\\/g, "\\\\") + "', sys.argv",
      "print(json.dumps(log))",
      "sys.exit(1)",
      "",
    ].join("\n"),
  );
  writeFileSync(silentPath, "import sys\nsys.stderr.write('no log here')\nsys.exit(3)\n");
  const findings = new PythonCheckerProcess(
    interpreter,
    [{ name: "findings", module: "ekphrasis_findings", function: "findings_log" }],
    10_000,
  );

  afterAll(() => findings.close());

  function run(command: readonly string[]) {
    return findings.call({
      checker: "findings",
      value: {},
      instance: {},
      path: "",
      file: record,
      arguments: { command: [...command] },
    });
  }

  function runWithContext(command: readonly string[]) {
    return findings.call({
      checker: "findings",
      value: {},
      instance: {},
      path: "",
      file: record,
      arguments: { command: [...command], context_property: "tool/validationContext" },
    });
  }

  it("returns the results on the checked file with their location and guidance", async () => {
    await expect(run([toolPath, "{folder}"])).resolves.toEqual([
      {
        message: "tool did not complete its run: a record could not be read",
        pointer: "",
        severity: "warning",
      },
      {
        message: "laws.expression -> zz",
        severity: "error",
        pointer: "/laws",
        rule: "area/unresolved",
        discriminator: "f/expression/zz",
        controlled_by: "/title",
        result_class: "method-conformance finding",
        repair_condition: "Every identifier resolves.",
        documentation_target: "docs/rules.md",
        source_file: "record.yml",
      },
      {
        message: "Typed",
        severity: "warning",
        locus: "term:glossary",
        rule: "area/term",
        source_file: "record.yml",
      },
    ]);
  });

  it("returns a configured run context separately from its issues", async () => {
    const returned = await runWithContext([toolPath, "{folder}"]);
    expect(returned).toContainEqual({
      kind: "context",
      label: "Completion target",
      value: "question-typed",
      description: "Checks completion through the typed question.",
      result_class: "computed inquiry diagnosis",
      documentation_target: "docs/scopes.md#question-typed",
    });
    expect(returned).toContainEqual({
      kind: "context",
      label: "Clean result",
      value: "structural and method conformance only",
      description: "The check establishes no truth, warrant or acceptance.",
      documentation_target: "docs/results.md",
    });
  });

  it("reports a command that writes no findings log, with its error output", async () => {
    await expect(run([silentPath])).rejects.toThrow(
      "the command exited with status 3 without writing a findings log: no log here",
    );
  });
});

describe("built-in source-state checker", () => {
  const folder = join(root, "freshness");
  const record = join(folder, "view.yml");
  const statePath = join(root, "source-state.py");
  const failedPath = join(root, "source-state-failed.py");
  mkdirSync(folder, { recursive: true });
  writeFileSync(record, "source_state: sha256:old\n");
  writeFileSync(statePath, "import sys\nprint(sys.argv[1])\n");
  writeFileSync(
    failedPath,
    "import sys\nsys.stderr.write('the records cannot be read')\nsys.exit(2)\n",
  );
  const freshness = new PythonCheckerProcess(
    interpreter,
    [{ name: "freshness", module: "ekphrasis_commands", function: "source_state" }],
    10_000,
  );

  afterAll(() => freshness.close());

  function compare(stored: string, command: readonly string[]) {
    return freshness.call({
      checker: "freshness",
      value: { source_state: stored },
      instance: { source_state: stored },
      path: "",
      file: record,
      arguments: { command: [...command], pointer: "/source_state" },
    });
  }

  it("states when the stored source state is current", async () => {
    await expect(compare("sha256:current", [statePath, "sha256:current"])).resolves.toEqual([
      {
        kind: "context",
        label: "Source state",
        value: "current",
        description: "The stored source state matches the current source records.",
        result_class: "generated-artifact freshness",
      },
    ]);
  });

  it("locates a stale source state and tells the researcher how to repair it", async () => {
    await expect(compare("sha256:old", [statePath, "sha256:current"])).resolves.toEqual([
      {
        message:
          "This generated file is stale: its stored source state does not match the current " +
          "source records. Regenerate the file before relying on it.",
        pointer: "/source_state",
        severity: "warning",
        result_class: "generated-artifact freshness",
        repair_condition: "Regenerate the file from the current source records.",
      },
    ]);
  });

  it("reports a source-state command that cannot compute the current state", async () => {
    await expect(compare("sha256:old", [failedPath])).rejects.toThrow(
      "the source-state command exited with status 2: the records cannot be read",
    );
  });
});
