/**
 * Exit criterion of the milestone *Bound form*: each record of the fixtures opens with the
 * schema resolved from its modeline or from a path rule, and each scalar displays in the
 * control of its kind. Every other fixture is unbound, and opens in the source view.
 */
import { describe, expect, it } from "vitest";
import { createDefaultRegistry } from "../../src/adapters/obsidian/ui/default-registry";
import { DEFAULT_SETTINGS, FormService } from "../../src/application";
import { isScalarKind, type YamlNode } from "../../src/domain";
import { FileSchemaLoader, YamlDocumentParser } from "../../src/infrastructure";
import { allFields } from "../support/form-fields";
import { DirectoryFileSource, FIXTURE_BINDINGS, FIXTURE_RULES } from "../support/fixture-vault";
import { FIXTURES_ROOT, readYamlFiles } from "../support/yaml-files";
import { createValidation } from "../support/validation";

const parser = new YamlDocumentParser();
const forms = new FormService(
  parser,
  new FileSchemaLoader(new DirectoryFileSource(FIXTURES_ROOT)),
  createValidation(),
  () => ({ ...DEFAULT_SETTINGS, pathRules: FIXTURE_RULES }),
);
const registry = createDefaultRegistry();

/** Fixture files that are instances, as opposed to the schemas of the fixtures. */
const instances = readYamlFiles(FIXTURES_ROOT).filter(({ name }) => !name.includes("schemas/"));

/** Start offsets of the scalar values of a tree, keys and aliases excluded. */
function scalarOffsets(node: YamlNode): number[] {
  switch (node.kind) {
    case "scalar":
      return node.range === null ? [] : [node.range.start];
    case "mapping":
      return node.entries.flatMap((entry) => scalarOffsets(entry.value));
    case "sequence":
      return node.items.flatMap(scalarOffsets);
    case "alias":
      return [];
  }
}

describe("bound form on the fixtures", () => {
  it("binds every record named by the expected bindings", () => {
    const names = instances.map(({ name }) => name);
    for (const record of Object.keys(FIXTURE_BINDINGS)) expect(names).toContain(record);
  });

  describe.each(instances)("$name", ({ name, text }) => {
    const expected = FIXTURE_BINDINGS[name.split("\\").join("/")];

    it(expected ? `opens as a form bound by its ${expected}` : "stays unbound", async () => {
      const state = await forms.open(name, text);
      if (expected === undefined) {
        expect(state.status).toBe("unbound");
        return;
      }
      if (state.status !== "form") throw new Error(`Expected a form, got ${state.status}.`);
      expect(state.binding.source).toBe(expected);
      expect(state.model.schemaIssues).toEqual([]);

      const fields = allFields(state.model.root);
      expect(fields.filter((field) => field.mismatch !== null)).toEqual([]);
      expect(
        fields.flatMap((field) => ("extraEntries" in field ? field.extraEntries : [])),
      ).toEqual([]);

      const scalars = fields.filter((field) => isScalarKind(field.kind));
      for (const field of scalars) expect(registry.hasControl(field.kind)).toBe(true);
      // A group or a collection holding an unfilled scalar displays it as its empty state.
      const displaying = fields.filter((field) => isScalarKind(field.kind) || field.unfilled);
      const displayed = new Set(
        displaying.flatMap((field) => (field.node?.range ? [field.node.range.start] : [])),
      );
      expect(scalarOffsets(parser.parse(text)).filter((offset) => !displayed.has(offset))).toEqual(
        [],
      );
    });
  });
});
