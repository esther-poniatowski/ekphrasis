// @vitest-environment happy-dom
/** A generated file states whether its stored source state still matches its source records. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cleanup } from "@testing-library/preact";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { CustomCheckerService, SOURCE_STATE_CHECKER } from "../../src/application";
import { PythonCheckerProcess } from "../../src/infrastructure";
import { MemoryFileSource } from "../support/fixture-vault";
import { element, renderForm } from "../support/rendered-form";

const root = mkdtempSync(join(tmpdir(), "ekphrasis-freshness-"));
const command = join(root, "source-state.py");
writeFileSync(command, "import sys\nprint(sys.argv[1])\n");

const schema = [
  "type: object",
  "readOnly: true",
  "required: [source_state]",
  "properties:",
  "  source_state: {type: string, title: Source state}",
  "",
].join("\n");
const files = new MemoryFileSource({ "view.schema.yml": schema });
const rules = [{ pattern: "view.yml", schema: "view.schema.yml" }] as const;
const interpreter = process.env["PYTHON"] ?? "python3";

afterEach(cleanup);
afterAll(() => rmSync(root, { recursive: true, force: true }));

async function rendered(stored: string, current: string) {
  const registration = {
    name: "freshness",
    ...SOURCE_STATE_CHECKER,
    schemas: ["view.schema.yml"],
    arguments: { command: [command, current], pointer: "/source_state" },
  };
  const runner = new PythonCheckerProcess(interpreter, [registration], 10_000);
  const checkers = new CustomCheckerService(
    () => [registration],
    () => runner,
    (path) => join(root, path),
  );
  try {
    return await renderForm(
      files,
      rules,
      "view.yml",
      `source_state: ${stored}\n`,
      true,
      {},
      checkers,
    );
  } finally {
    await runner.close();
  }
}

describe("generated-file freshness", () => {
  it("states when the displayed file is current", async () => {
    const form = await rendered("sha256:current", "sha256:current");

    expect(element(form.container, ".ekphrasis-checker-context-label").textContent).toBe(
      "Source state",
    );
    expect(element(form.container, ".ekphrasis-checker-context-value").textContent).toBe("current");
    expect(form.container.querySelector(".ekphrasis-issue")).toBeNull();
  });

  it("warns at the stored state before a stale file can be trusted", async () => {
    const form = await rendered("sha256:old", "sha256:current");

    const issue = element(
      form.container,
      '[data-path="source_state"] .ekphrasis-issue[data-checker="freshness"]',
    );
    expect(issue.classList.contains("mod-warning")).toBe(true);
    expect(issue.textContent).toContain("This generated file is stale");
    expect(issue.textContent).toContain("Regenerate the file from the current source records.");
    expect(form.container.querySelector(".ekphrasis-checker-context")).toBeNull();
  });
});
