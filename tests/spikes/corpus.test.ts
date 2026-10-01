/**
 * Optional corpus test: runs the spike on byte preservation on the records of the consumer
 * projects, read from the folder named by the environment variable `EKPHRASIS_CORPUS`.
 *
 * The test is skipped when the variable is unset, so continuous integration never reads it.
 */
import { describe, expect, it } from "vitest";
import { CORPUS_VARIABLE, readYamlFiles } from "../support/yaml-files";
import { failingEdits, keepStyle } from "./scalar-edit";

const corpusRoot = process.env[CORPUS_VARIABLE];

describe.skipIf(corpusRoot === undefined)(`corpus named by ${CORPUS_VARIABLE}`, () => {
  const files = corpusRoot === undefined ? [] : readYamlFiles(corpusRoot);

  it("holds at least one YAML file", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("preserves every byte outside the edited token in $name", ({ text }) => {
    expect(failingEdits(text, keepStyle)).toEqual([]);
  });
});
