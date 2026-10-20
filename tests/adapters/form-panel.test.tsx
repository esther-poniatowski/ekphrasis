// @vitest-environment happy-dom
/**
 * Boxes at the top of the form and message of an unbound file, in a simulated DOM: the title of
 * the box of issues lists the counts, both boxes put each message in a column after its path,
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

function renderPanel(state: FormState): Element {
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
      commitDelay={DEFAULT_SETTINGS.commitDelay}
      folds={new FoldState()}
      onOpenSource={() => undefined}
    />,
  ).container;
}

describe("boxes at the top of the form", () => {
  it("titles the box of issues by the list of counts, without a final period", async () => {
    const container = renderPanel(await stateOf("title: open\nstatus: open\ncount: many\n"));
    const title = container.querySelector(".ekphrasis-issue-summary-title");
    expect(title?.textContent).toBe("Validation: 3 missing fields, 1 invalid value");
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
  it("names the line of the modeline after its place in the file", async () => {
    const container = renderPanel(await stateOf(""));
    const text = container.textContent ?? "";
    expect(text).toContain("bind it to a schema by one of two methods:");
    expect(text).not.toContain("ways");
    const [modeline, rule] = Array.from(container.querySelectorAll(".ekphrasis-message-list > li"));
    expect(modeline?.textContent).toBe(
      "write at the top of the file the line # yaml-language-server: $schema=path/to/schema.yaml;",
    );
    expect(rule?.textContent).toBe("add a path rule in the settings of ekphrasis.");
  });
});
