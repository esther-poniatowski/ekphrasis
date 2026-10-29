import { describe, expect, it } from "vitest";
import { resolveBinding, type PathRule } from "../../../src/domain";

const RULES: readonly PathRule[] = [
  { pattern: "", schema: "ignored.schema.yaml" },
  { pattern: "records/**/*.yml", schema: "schemas/record.schema.yaml" },
  { pattern: "records/q.yml", schema: "schemas/second.schema.yaml" },
];

describe("schema binding", () => {
  it("prefers the logical schema field and resolves it through the registry", () => {
    const registry = new Map([["vault:record@1", "schemas/record.schema.yaml"]]);
    expect(
      resolveBinding("records/q.yml", "_schema: vault:record@1\nid: x\n", RULES, registry),
    ).toEqual({
      status: "bound",
      binding: {
        source: "schema-field",
        reference: "vault:record@1",
        schemaPath: "schemas/record.schema.yaml",
      },
    });
  });

  it("fails closed when a declared logical schema is unknown", () => {
    const text = "_schema: vault:unknown@1\n# yaml-language-server: $schema=fallback.yaml\n";
    expect(resolveBinding("q.yml", text, [], new Map())).toMatchObject({
      status: "invalid",
      source: "schema-field",
      reference: "vault:unknown@1",
    });
  });

  it("does not mistake a nested control-like key for the record binding", () => {
    expect(resolveBinding("q.yml", "nested:\n  _schema: vault:nested@1\n", [])).toEqual({
      status: "unbound",
    });
  });

  it("prefers the modeline, resolved from the folder of the instance", () => {
    const text = "# yaml-language-server: $schema=../schemas/q.schema.yaml\n";
    expect(resolveBinding("records/q.yml", text, RULES)).toEqual({
      status: "bound",
      binding: {
        source: "modeline",
        reference: "../schemas/q.schema.yaml",
        schemaPath: "schemas/q.schema.yaml",
      },
    });
  });

  it("applies the first matching complete rule, from the vault root", () => {
    expect(resolveBinding("records/q.yml", "id: x\n", RULES)).toEqual({
      status: "bound",
      binding: {
        source: "path-rule",
        reference: "schemas/record.schema.yaml",
        schemaPath: "schemas/record.schema.yaml",
      },
    });
  });

  it("leaves a file unbound when no source names a schema", () => {
    expect(resolveBinding("notes/q.yml", "id: x\n", RULES)).toEqual({ status: "unbound" });
  });

  it("reports a remote schema and a path leaving the vault as invalid", () => {
    const remote = "# yaml-language-server: $schema=https://example.org/q.json\n";
    expect(resolveBinding("q.yml", remote, [])).toMatchObject({
      status: "invalid",
      reason: "remote schemas are not supported",
    });
    const outside = "# yaml-language-server: $schema=../q.json\n";
    expect(resolveBinding("q.yml", outside, [])).toMatchObject({
      status: "invalid",
      reason: "the path leaves the vault",
    });
  });
});
