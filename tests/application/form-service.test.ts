import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, FormService, type EkphrasisSettings } from "../../src/application";
import { FileSchemaLoader, YamlDocumentParser } from "../../src/infrastructure";
import { MemoryFileSource } from "../support/fixture-vault";

const SCHEMA = "type: object\nproperties:\n  id: { type: string }\n";

function service(
  files: Record<string, string>,
  settings: EkphrasisSettings = DEFAULT_SETTINGS,
): FormService {
  return new FormService(
    new YamlDocumentParser(),
    new FileSchemaLoader(new MemoryFileSource(files)),
    () => settings,
  );
}

const MODELINE = "# yaml-language-server: $schema=s.schema.yaml\n";

describe("FormService", () => {
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
      () => settings,
    );
    expect((await forms.open("q.yml", "id: x\n")).status).toBe("unbound");

    settings = { pathRules: [{ pattern: "*.yml", schema: "s.yaml" }] };
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
});
