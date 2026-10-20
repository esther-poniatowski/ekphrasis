// @vitest-environment happy-dom
/**
 * Regression test of the dropdown, in a simulated DOM: after successive changes of its value, a
 * dropdown lists the empty option and each admitted value once. The form is rendered from the
 * gnomon question fixture through the session of the instance, as the instance view renders it,
 * so each commit rebuilds the form model and renders the panel again.
 */
import { cleanup, fireEvent } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { DirectoryFileSource, FIXTURE_RULES } from "../support/fixture-vault";
import { renderForm } from "../support/rendered-form";
import { FIXTURES_ROOT, readYamlFiles } from "../support/yaml-files";

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

/** Form of the question fixture, rendered after each commit. */
async function renderedQuestion(): Promise<Element> {
  const text = readYamlFiles(FIXTURES_ROOT).find(({ name }) => name === PATH)?.text ?? "";
  const form = await renderForm(new DirectoryFileSource(FIXTURES_ROOT), FIXTURE_RULES, PATH, text);
  return form.container;
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
