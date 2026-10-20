// @vitest-environment happy-dom
/**
 * Regression test of the dropdown, in a simulated DOM: after successive changes of its value, a
 * dropdown lists the empty option and each admitted value once. The form is rendered from the
 * gnomon question fixture through the session of the instance, as the instance view renders it,
 * so each commit rebuilds the form model and renders the panel again.
 */
import { cleanup, fireEvent, render } from "@testing-library/preact";
import type { ComponentChild } from "preact";
import { afterEach, describe, expect, it } from "vitest";
import {
  CommitService,
  DEFAULT_SETTINGS,
  FormService,
  InstanceSession,
  type SessionHost,
} from "../../src/application";
import { createDefaultRegistry } from "../../src/adapters/obsidian/ui/default-registry";
import { FormPanel } from "../../src/adapters/obsidian/ui/form-panel";
import { FileSchemaLoader, YamlDocumentParser, YamlSourceEditor } from "../../src/infrastructure";
import { DirectoryFileSource, FIXTURE_RULES } from "../support/fixture-vault";
import { FIXTURES_ROOT, readYamlFiles } from "../support/yaml-files";
import { createValidation } from "../support/validation";

const PATH = "gnomon/question.yml";
const AIMS = [
  "Description (description)",
  "Exploration (exploration)",
  "Prediction (prediction)",
  "Explanation (explanation)",
  "Modal knowledge (modal-knowledge)",
  "Model knowledge (model-knowledge)",
];

afterEach(cleanup);

/** Session of the question fixture, whose host renders the form panel after each change. */
async function renderedQuestion(): Promise<Element> {
  const parser = new YamlDocumentParser();
  const forms = new FormService(
    parser,
    new FileSchemaLoader(new DirectoryFileSource(FIXTURES_ROOT)),
    createValidation(),
    () => ({ ...DEFAULT_SETTINGS, pathRules: FIXTURE_RULES }),
  );
  const commits = new CommitService(parser, new YamlSourceEditor(), createValidation());
  const registry = createDefaultRegistry();
  let rerender: ((ui: ComponentChild) => void) | null = null;
  const panel = (): ComponentChild => (
    <FormPanel
      snapshot={session.snapshot}
      registry={registry}
      commit={(path, value) => session.commit({ path, value })}
      commitDelay={DEFAULT_SETTINGS.commitDelay}
      onOpenSource={() => undefined}
    />
  );
  const host: SessionHost = {
    write: () => undefined,
    changed: () => rerender?.(panel()),
  };
  const session = new InstanceSession(forms, commits, host);
  const text = readYamlFiles(FIXTURES_ROOT).find(({ name }) => name === PATH)?.text ?? "";
  session.setText(text);
  const result = render(<div />);
  rerender = result.rerender;
  await session.refresh(PATH);
  return result.container;
}

function aimDropdown(container: Element): HTMLSelectElement {
  const select = container.querySelector<HTMLSelectElement>(
    '[data-path="task.epistemic_aim"] select',
  );
  if (select === null) throw new Error("No dropdown for task.epistemic_aim.");
  return select;
}

const optionLabels = (select: HTMLSelectElement): string[] =>
  Array.from(select.options, (option) => option.textContent ?? "");

describe("dropdown of a field of kind choice", () => {
  it("lists the empty option and each admitted value once after successive changes", async () => {
    const container = await renderedQuestion();
    const choices = ["exploration", "modal-knowledge", "prediction", null, "exploration"];
    for (const choice of choices) {
      const select = aimDropdown(container);
      const position =
        choice === null ? -1 : AIMS.findIndex((label) => label.endsWith(`(${choice})`));
      fireEvent.change(select, { target: { value: position < 0 ? "" : String(position) } });
      const after = aimDropdown(container);
      expect(optionLabels(after)).toEqual(["—", ...AIMS]);
      expect(after.value).toBe(position < 0 ? "" : String(position));
    }
  });
});
