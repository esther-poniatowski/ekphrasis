/**
 * Guidance carried from a commented template into a schema-derived form.
 *
 * The form carries the guidance of a template when it displays, at each key of the template, the
 * admitted values that a comment lists, the instructions that a comment gives, and an example of
 * the value that a placeholder shows, as `template-guidance.ts` defines them. Two texts are
 * measured in two independent contexts:
 *
 * - small synthetic schemas exercise the detection of each guidance class;
 * - the optional Gnomon corpus test loads Gnomon's generated contract through its version 2
 *   registry, so Ekphrasis never copies Gnomon's field guidance into its fixtures.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { DEFAULT_SETTINGS, RegistryReader } from "../../src/application";
import { FileSchemaLoader, YamlDocumentParser } from "../../src/infrastructure";
import { DirectoryFileSource } from "../support/fixture-vault";
import { schemaSet } from "../support/schemas";
import { guidanceGaps, listedValues } from "../support/template-guidance";
import { CORPUS_VARIABLE } from "../support/yaml-files";

const TEMPLATES = "src/gnomon/data/templates";
const REGISTRY = "specs/schema-registry.yml";
const corpusRoot = process.env[CORPUS_VARIABLE];
const templatesPath = corpusRoot === undefined ? null : join(corpusRoot, TEMPLATES);
const registryPath = corpusRoot === undefined ? null : join(corpusRoot, REGISTRY);
const hasGnomonContracts =
  templatesPath !== null &&
  registryPath !== null &&
  existsSync(templatesPath) &&
  existsSync(registryPath);

const GUIDANCE_SCHEMA = schemaSet({
  "guidance.schema.json": {
    type: "object",
    description: "A guided record.",
    properties: {
      status: { enum: ["open", "closed"], description: "State of the record." },
      title: { type: "string", examples: ["A concise title"] },
      tests: {
        type: "object",
        properties: { verdict: { enum: ["pending", "pass"] } },
      },
    },
  },
});

const DEFECTIVE_SCHEMA = schemaSet({
  "guidance.schema.json": {
    type: "object",
    properties: {
      status: { enum: ["posed"] },
      title: { type: "string", examples: ["A concise title"] },
      type: { const: "question" },
      virtues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            check: {
              type: "object",
              properties: { evidence: { type: "string" } },
            },
          },
        },
      },
    },
  },
});

describe("values listed by a comment", () => {
  it("reads each value around the separators, without the explanations in parentheses", () => {
    expect(listedValues("posed | refined | answered")).toEqual(["posed", "refined", "answered"]);
    expect(
      listedValues("constitutive (the product test applies it) | preferred (appraisal ranks)"),
    ).toEqual(["constitutive", "preferred"]);
    expect(
      listedValues("one maturity per field: open | provisional | stabilized; the rest"),
    ).toEqual(["open", "provisional", "stabilized"]);
    expect(listedValues("restate the fields")).toEqual([]);
  });
});

describe("guidance of a form", () => {
  it("carries instructions, admitted values, and examples from a synthetic schema", () => {
    const text = [
      "# Fill this record before continuing.",
      "status: open # open | closed",
      "title: SHORT TITLE",
      "tests: # pending | pass",
      "  verdict: pending",
      "",
    ].join("\n");
    expect(guidanceGaps(GUIDANCE_SCHEMA, text)).toEqual([]);
  });

  it("reports a key outside the schema, an unlisted value, a comment without instructions, and a placeholder without example", () => {
    const text = [
      "status: posed # posed | withdrawn",
      "title: SHORT NAME",
      "type: question # the only type",
      "extra: 1 # unknown",
      "virtues:",
      '  - check: { evidence: "EVIDENCE OF THE VERDICT" }',
      "",
    ].join("\n");
    expect(guidanceGaps(DEFECTIVE_SCHEMA, text, { header: false })).toEqual([
      { path: "status", missing: "admitted values", detail: "withdrawn" },
      { path: "type", missing: "instructions", detail: "the only type" },
      { path: "extra", missing: "field", detail: "no field of the form holds this key" },
      { path: "virtues[0].check.evidence", missing: "example", detail: "EVIDENCE OF THE VERDICT" },
    ]);
  });
});

describe.skipIf(!hasGnomonContracts)(`gnomon contracts named by ${CORPUS_VARIABLE}`, () => {
  it("carries every instruction, admitted value, and example of every editable template", async () => {
    const root = corpusRoot ?? "";
    const files = new DirectoryFileSource(root);
    const settings = () => ({ ...DEFAULT_SETTINGS, schemaRegistry: REGISTRY });
    const registry = new RegistryReader(new YamlDocumentParser(), files, settings);
    const state = await registry.read();
    expect(state.status).toBe("read");
    if (state.status !== "read" || templatesPath === null) return;
    const failures: string[] = [];
    for (const name of readdirSync(templatesPath).filter((entry) => entry.endsWith(".yml"))) {
      const text = readFileSync(join(templatesPath, name), "utf8");
      const identifier = (parse(text) as { _schema?: unknown })._schema;
      if (typeof identifier !== "string") {
        failures.push(`${name}: template names no contract`);
        continue;
      }
      const schemaPath = state.registry.schemas.get(identifier);
      if (schemaPath === undefined) {
        failures.push(`${name}: registry does not resolve ${identifier}`);
        continue;
      }
      const schemas = await new FileSchemaLoader(files, registry).load(schemaPath);
      const gaps = guidanceGaps(schemas, text).filter((gap) => gap.path !== "_schema");
      failures.push(...gaps.map((gap) => `${name}:${gap.path}: ${gap.missing} (${gap.detail})`));
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
});
