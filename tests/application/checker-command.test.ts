import { describe, expect, it } from "vitest";
import { commandTarget, timeoutVerdict } from "../../src/application";
import { commandLine } from "../../src/application/diagnostic/checker-command";

describe("the target of a checker command", () => {
  it.each<[readonly string[], ReturnType<typeof commandTarget>]>([
    [["-m", "tool", "check", "{folder}"], { kind: "module", name: "tool" }],
    [["-B", "-X", "utf8", "-mtool.cli", "check"], { kind: "module", name: "tool.cli" }],
    [["-W", "ignore", "scripts/check.py", "{file}"], { kind: "script", path: "scripts/check.py" }],
    [["-c", "print(1)"], { kind: "code" }],
    [["-m"], { kind: "none" }],
  ])("reads %j", (command, target) => {
    expect(commandTarget(command)).toEqual(target);
  });

  it("expands the placeholders and quotes the words of a copyable command line", () => {
    expect(
      commandLine("/env/bin/python", ["-m", "tool", "{folder}", "--name", "a b"], "/v/n/r.yml"),
    ).toBe("/env/bin/python -m tool /v/n --name 'a b'");
  });
});

describe("the timeout verdict of a measured duration", () => {
  it("passes a timeout that covers a call queued behind another", () => {
    expect(timeoutVerdict(5000, 10_000)).toEqual({ status: "pass", recommendedMs: 10_000 });
  });

  it("warns when only a lone call fits, and fails when a lone call reaches the timeout", () => {
    expect(timeoutVerdict(5700, 10_000)).toEqual({ status: "warning", recommendedMs: 11_400 });
    expect(timeoutVerdict(10_000, 10_000).status).toBe("fail");
  });

  it("keeps the recommendation within the admitted limits", () => {
    expect(timeoutVerdict(10, 100_000).recommendedMs).toBe(100);
    expect(timeoutVerdict(90_000, 100_000).recommendedMs).toBe(120_000);
  });
});
