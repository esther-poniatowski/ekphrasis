import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, FormService, type EkphrasisSettings } from "../../src/application";
import { FileSchemaLoader, YamlDocumentParser } from "../../src/infrastructure";
import { MemoryFileSource } from "../support/fixture-vault";
import {
  BASE_PATH,
  COMMON_PATH,
  COMPOSED_SETTINGS,
  COMPOSED_VAULT,
  composedLoader,
  REGISTRY_PATH,
  ROOT_PATH,
} from "../support/composed-vault";
import { createValidation } from "../support/validation";

const SCHEMA = "type: object\nproperties:\n  id: { type: string }\n";

function service(
  files: Record<string, string>,
  settings: EkphrasisSettings = DEFAULT_SETTINGS,
): FormService {
  const source = new MemoryFileSource(files);
  return new FormService(
    new YamlDocumentParser(),
    new FileSchemaLoader(source),
    createValidation(),
    () => settings,
    source,
  );
}

const MODELINE = "# yaml-language-server: $schema=s.schema.yaml\n";

describe("FormService", () => {
  it("opens a registered logical schema and omits its control field from the form", async () => {
    const schema = [
      "$id: record.schema.yaml",
      "type: object",
      "required: [_schema, id]",
      "properties:",
      "  _schema: { const: 'vault:record@1' }",
      "  id: { type: string }",
      "",
    ].join("\n");
    const settings = { ...DEFAULT_SETTINGS, schemaRegistry: "schemas.yml" };
    const state = await service(
      {
        "schemas.yml": "schemas:\n  vault:record@1: record.schema.yaml\n",
        "record.schema.yaml": schema,
      },
      settings,
    ).open("record.yml", "_schema: vault:record@1\nid: x\n");

    expect(state).toMatchObject({
      status: "form",
      binding: { source: "schema-field", schemaPath: "record.schema.yaml" },
      schemaPaths: ["schemas.yml", "record.schema.yaml"],
    });
    if (state.status === "form" && state.model.root.kind === "group") {
      expect(state.model.root.children.map((field) => field.key)).toEqual(["id"]);
    }
  });

  it("rejects a registry entry whose schema declares another logical contract", async () => {
    const settings = { ...DEFAULT_SETTINGS, schemaRegistry: "schemas.yml" };
    const state = await service(
      {
        "schemas.yml": "schemas:\n  vault:record@1: record.schema.yaml\n",
        "record.schema.yaml": [
          "type: object",
          "properties:",
          "  _schema: { const: 'vault:record@2' }",
          "",
        ].join("\n"),
      },
      settings,
    ).open("record.yml", "_schema: vault:record@1\n");

    expect(state).toMatchObject({ status: "schema-error" });
  });

  it("watches a registry that cannot yet resolve the logical contract", async () => {
    const settings = { ...DEFAULT_SETTINGS, schemaRegistry: "schemas.yml" };
    const state = await service({}, settings).open(
      "record.yml",
      "_schema: vault:record@1\nid: x\n",
    );

    expect(state).toMatchObject({
      status: "invalid-binding",
      schemaPaths: ["schemas.yml"],
    });
  });

  it("opens the form of an instance bound by its modeline", async () => {
    const state = await service({ "r/s.schema.yaml": SCHEMA }).open(
      "r/q.yml",
      `${MODELINE}id: x\n`,
    );

    expect(state).toMatchObject({
      status: "form",
      binding: { source: "modeline", schemaPath: "r/s.schema.yaml" },
      schemaPaths: ["r/s.schema.yaml"],
    });
  });

  it("reads the path rules of the current settings at each opening", async () => {
    let settings: EkphrasisSettings = DEFAULT_SETTINGS;
    const forms = new FormService(
      new YamlDocumentParser(),
      new FileSchemaLoader(new MemoryFileSource({ "s.yaml": SCHEMA })),
      createValidation(),
      () => settings,
    );
    expect((await forms.open("q.yml", "id: x\n")).status).toBe("unbound");

    settings = { ...DEFAULT_SETTINGS, pathRules: [{ pattern: "*.yml", schema: "s.yaml" }] };
    expect((await forms.open("q.yml", "id: x\n")).status).toBe("form");
  });

  it("reports a parse error against the bound schema", async () => {
    const state = await service({ "s.schema.yaml": SCHEMA }).open("q.yml", `${MODELINE}id: [x\n`);

    expect(state).toMatchObject({
      status: "parse-error",
      binding: { schemaPath: "s.schema.yaml" },
    });
  });

  it("reports a schema that fails to load, with the paths to watch", async () => {
    const state = await service({}).open("q.yml", `${MODELINE}id: x\n`);

    expect(state).toMatchObject({ status: "schema-error", schemaPaths: ["s.schema.yaml"] });
  });

  it("reports a binding outside the vault", async () => {
    const state = await service({}).open("q.yml", "# yaml-language-server: $schema=../s.yaml\n");

    expect(state).toMatchObject({ status: "invalid-binding", source: "modeline" });
  });

  it("opens a consumer root composing a base of another folder by its absolute `$id`", async () => {
    const files = new MemoryFileSource(COMPOSED_VAULT);
    const forms = new FormService(
      new YamlDocumentParser(),
      composedLoader(files),
      createValidation(),
      () => COMPOSED_SETTINGS,
      files,
    );
    const state = await forms.open("notes/a.yml", "_schema: vault:note@1\nid: A1\nrole: other\n");

    expect(state).toMatchObject({
      status: "form",
      binding: { source: "schema-field", schemaPath: ROOT_PATH },
      schemaPaths: [REGISTRY_PATH, ROOT_PATH, BASE_PATH, COMMON_PATH],
    });
    if (state.status !== "form" || state.model.root.kind !== "group") return;
    expect(state.model.title).toBe("Note");
    expect(state.model.root.children.map((field) => [field.key, field.kind])).toEqual([
      ["id", "text"],
      ["role", "choice"],
      ["gloss", "text"],
    ]);
    expect(state.report.issues.map((issue) => [issue.id, issue.checker])).toEqual([
      ["id", "pattern"],
      ["role", "enum"],
    ]);
    expect(state.report.schemaIssues).toEqual([]);
  });

  it("watches the registry of a schema whose absolute URI it does not map", async () => {
    const files = new MemoryFileSource({
      ...COMPOSED_VAULT,
      [REGISTRY_PATH]: "schema_version: 2\nschemas:\n  'vault:note@1': schemas/note.schema.yaml\n",
    });
    const forms = new FormService(
      new YamlDocumentParser(),
      composedLoader(files),
      createValidation(),
      () => COMPOSED_SETTINGS,
      files,
    );
    const state = await forms.open("notes/a.yml", "_schema: vault:note@1\nid: a\n");

    expect(state).toMatchObject({
      status: "schema-error",
      schemaPaths: [REGISTRY_PATH, ROOT_PATH],
    });
    if (state.status === "schema-error") {
      expect(state.error.message).toContain("referenced from `schemas/note.schema.yaml`");
    }
  });
});
