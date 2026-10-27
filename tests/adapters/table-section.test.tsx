// @vitest-environment happy-dom
/** Regression test of the field-kind marker used to size table columns. */
import { cleanup } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { DirectoryFileSource, FIXTURE_RULES } from "../support/fixture-vault";
import { renderForm } from "../support/rendered-form";
import { FIXTURES_ROOT, readYamlFiles } from "../support/yaml-files";

const PATH = "gnomon/target-system.yml";

afterEach(cleanup);

describe("columns of a table", () => {
  it("marks each cell with the kind controlling its width", async () => {
    const text = readYamlFiles(FIXTURES_ROOT).find(({ name }) => name === PATH)?.text ?? "";
    const form = await renderForm(
      new DirectoryFileSource(FIXTURES_ROOT),
      FIXTURE_RULES,
      PATH,
      text,
    );

    expect(form.container.querySelector("td[data-kind='choice'] select")).not.toBeNull();
    expect(form.container.querySelector("td[data-kind='text'] input")).not.toBeNull();
  });
});
