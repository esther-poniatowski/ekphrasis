// @vitest-environment happy-dom
/**
 * Boxes at the top of the form and message of an unbound file, in a simulated DOM: the box of
 * issues lists the counts of each kind with the fields reached from them, both boxes put each
 * message in a column after its path,
 * and the message of an unbound file names the line of the modeline after its place.
 */
import { cleanup, render } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  FormService,
  type FormState,
  type SessionSnapshot,
} from "../../src/application";
import { createDefaultRegistry } from "../../src/adapters/obsidian/ui/default-registry";
import { FoldState } from "../../src/adapters/obsidian/ui/fold-state";
import { FormPanel } from "../../src/adapters/obsidian/ui/form-panel";
import { HelpState } from "../../src/adapters/obsidian/ui/help-state";
import { IMMEDIATE_SCHEDULER } from "../../src/adapters/obsidian/ui/rendering/render-queue";
import { TEXT_RENDERER } from "../../src/adapters/obsidian/ui/rendering/value-renderer";
import type { YamlPath } from "../../src/domain";
import { FileSchemaLoader, YamlDocumentParser } from "../../src/infrastructure";
import { MemoryFileSource } from "../support/fixture-vault";
import { createValidation } from "../support/validation";

const SCHEMA = [
  "type: object",
  "required: [title, status, ghost]",
  "x-unfilled: [open]",
  "properties:",
  "  title: { type: string }",
  "  status: { enum: [posed, answered, open] }",
  "  count: { type: integer }",
].join("\n");

afterEach(cleanup);

async function stateOf(text: string): Promise<FormState> {
  const forms = new FormService(
    new YamlDocumentParser(),
    new FileSchemaLoader(new MemoryFileSource({ "s.yaml": SCHEMA })),
    createValidation(),
    () => ({ ...DEFAULT_SETTINGS, pathRules: [{ pattern: "bound/*.yml", schema: "s.yaml" }] }),
  );
  return forms.open(text === "" ? "free.yml" : "bound/r.yml", text);
}

function renderPanel(
  state: FormState,
  reveal: (path: YamlPath) => void = () => undefined,
): Element {
  const snapshot: SessionSnapshot = {
    state,
    form: state.status === "form" ? state : null,
    errors: new Map(),
  };
  return render(
    <FormPanel
      snapshot={snapshot}
      registry={createDefaultRegistry()}
      commit={() => undefined}
      commitAll={() => false}
      confirmLoss={() => Promise.resolve(false)}
      commitDelay={DEFAULT_SETTINGS.commitDelay}
      folds={new FoldState()}
      help={new HelpState()}
      renderer={TEXT_RENDERER}
      scheduler={IMMEDIATE_SCHEDULER}
      reveal={reveal}
      onOpenSource={() => undefined}
    />,
  ).container;
}

describe("boxes at the top of the form", () => {
  it("lists one line per kind of issue, naming the fields that a click reaches", async () => {
    const reveals: unknown[] = [];
    const container = renderPanel(
      await stateOf("title: open\nstatus: open\ncount: many\n"),
      (path) => reveals.push(path),
    );
    expect(container.querySelector(".ekphrasis-issue-summary-title")?.textContent).toBe(
      "Validation",
    );
    const lines = Array.from(container.querySelectorAll(".ekphrasis-issue-line"), (line) => [
      line.querySelector(".ekphrasis-issue-line-count")?.textContent,
      Array.from(line.querySelectorAll("button"), (button) => button.textContent),
    ]);
    // The required property `ghost` has no field, so it is listed below the lines, with its path.
    expect(lines).toEqual([
      ["3 missing fields", ["title", "status"]],
      ["1 invalid value", ["count"]],
    ]);
    const [, count] = Array.from(container.querySelectorAll<HTMLElement>(".ekphrasis-field-link"));
    count?.click();
    expect(reveals).toEqual([["status"]]);
  });

  it("puts each message after its path, in both boxes", async () => {
    const container = renderPanel(await stateOf("title: open\nstatus: open\n"));
    for (const box of [".ekphrasis-schema-issues", ".ekphrasis-issue-summary"]) {
      const items = Array.from(container.querySelectorAll(`${box} .ekphrasis-path-messages > li`));
      expect(items.length, box).toBeGreaterThan(0);
      for (const item of items) {
        const children = Array.from(item.children, (child) => child.className);
        expect(children).toEqual(["ekphrasis-issue-path", "ekphrasis-issue-message"]);
      }
    }
  });
});

describe("message of an unbound file", () => {
  it("presents the three binding routes in precedence order", async () => {
    const container = renderPanel(await stateOf(""));
    const text = container.textContent ?? "";
    expect(text).toContain("bind it to a schema by one of three methods:");
    expect(text).not.toContain("ways");
    const [field, modeline, rule] = Array.from(
      container.querySelectorAll(".ekphrasis-message-list > li"),
    );
    expect(field?.textContent).toBe("declare its logical identifier in a top-level _schema field;");
    expect(modeline?.textContent).toBe(
      "write at the top of the file the line # yaml-language-server: $schema=path/to/schema.yaml;",
    );
    expect(rule?.textContent).toBe("add a path rule in the settings of ekphrasis.");
  });

  it("states why a logical contract cannot resolve", () => {
    const container = renderPanel({
      status: "invalid-binding",
      source: "schema-field",
      reference: "vault:record@1",
      reason: "the identifier is absent from the registry",
      schemaPaths: ["schemas.yml"],
    });
    expect(container.textContent).toContain(
      "The logical contract vault:record@1 cannot be resolved because the identifier is absent from the registry.",
    );
  });
});
