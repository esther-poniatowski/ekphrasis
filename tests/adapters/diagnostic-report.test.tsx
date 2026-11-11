// @vitest-environment happy-dom
/**
 * Panel of the setup diagnostic, in a simulated DOM: the checks display by consequence, failures
 * first, each with its status in words; a check that does not pass states the capability affected
 * and the next action; technical details stay folded; and a report holding failures of every
 * group stays complete.
 */
import { cleanup, fireEvent, render } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiagnosticPanel } from "../../src/adapters/obsidian/ui/diagnostic-report";
import type { DiagnosticCheck, DiagnosticReport } from "../../src/application";

afterEach(cleanup);

function failing(
  id: string,
  consequence: DiagnosticCheck["consequence"],
  status: DiagnosticCheck["status"],
  details: readonly string[] = [],
): DiagnosticCheck {
  return {
    id,
    consequence,
    dependency: `Dependency ${id}`,
    affects: `capability of ${id}`,
    status,
    observed: `Observed \`${id}\`.`,
    action: `Set *Python interpreter* for ${id}.`,
    details,
  };
}

const REPORT: DiagnosticReport = {
  durationMs: 10,
  checks: [
    {
      id: "registry.setting",
      consequence: "forms",
      dependency: "Schema registry setting",
      affects: "forms",
      status: "pass",
      observed: "The registry is `specs/registry.yml`.",
      action: null,
      details: [],
    },
    failing("registry.read", "forms", "fail", ["the registry `specs/registry.yml` is absent"]),
    failing("record.write", "saving", "fail"),
    failing("checker.interpreter", "checks", "fail"),
    failing("checker.launch", "checks", "unavailable"),
    failing("checker.record", "degraded", "warning"),
  ],
};

function panel(report: DiagnosticReport = REPORT) {
  const onCopy = vi.fn();
  const onRunAgain = vi.fn();
  const view = render(
    <DiagnosticPanel state={{ status: "ready", report }} onCopy={onCopy} onRunAgain={onRunAgain} />,
  );
  return { ...view, onCopy, onRunAgain };
}

describe("the panel of the setup diagnostic", () => {
  it("states that the checks are running before the report arrives", () => {
    const { container } = render(
      <DiagnosticPanel state={{ status: "running" }} onCopy={vi.fn()} onRunAgain={vi.fn()} />,
    );
    expect(container.textContent).toContain("runs once on the opened record");
  });

  it("groups the checks by consequence, in the order of the capabilities they block", () => {
    const { container } = panel();
    const titles = Array.from(container.querySelectorAll(".ekphrasis-diagnostic-group-title")).map(
      (title) => title.textContent,
    );
    expect(titles).toEqual([
      "Blocks schema-derived forms",
      "Blocks saving authored records",
      "Blocks configured custom checks",
      "Reduces functionality; editing stays available",
    ]);
    expect(container.querySelector(".ekphrasis-diagnostic-summary")?.textContent).toContain(
      "3 fail · 1 warning · 1 unavailable · 1 pass",
    );
  });

  it("lists failures first, with their status in words, the capability and the next action", () => {
    const { container } = panel();
    const forms = container.querySelector(".ekphrasis-diagnostic-group.mod-forms");
    const items = Array.from(forms?.querySelectorAll(".ekphrasis-diagnostic-check") ?? []);
    expect(items.map((item) => item.getAttribute("data-check"))).toEqual([
      "registry.read",
      "registry.setting",
    ]);
    const failure = items[0];
    expect(failure?.querySelector(".ekphrasis-diagnostic-status")?.textContent).toBe("Fail");
    expect(failure?.textContent).toContain("Affects: capability of registry.read");
    expect(failure?.querySelector(".ekphrasis-diagnostic-action em")?.textContent).toBe(
      "Python interpreter",
    );
    expect(failure?.querySelector(".ekphrasis-diagnostic-observed code")?.textContent).toBe(
      "registry.read",
    );
    expect(items[1]?.textContent).not.toContain("Next action");
  });

  it("keeps technical details folded and copyable", () => {
    const { container } = panel();
    const details = container.querySelector<HTMLDetailsElement>(
      "[data-check='registry.read'] details",
    );
    expect(details?.open).toBe(false);
    expect(details?.querySelector("pre")?.textContent).toBe(
      "the registry `specs/registry.yml` is absent",
    );
  });

  it("copies the report and runs the checks again on request", () => {
    const { getByText, onCopy, onRunAgain } = panel();
    fireEvent.click(getByText("Copy report"));
    fireEvent.click(getByText("Run again"));
    expect(onCopy).toHaveBeenCalledOnce();
    expect(onRunAgain).toHaveBeenCalledOnce();
  });
});
