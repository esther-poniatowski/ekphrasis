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
    const registry = new Map([["vault:record@1", "schemas/record.schema.yaml"]]);
    expect(resolveBinding("q.yml", text, [], registry)).toMatchObject({
      status: "invalid",
      source: "schema-field",
      reference: "vault:unknown@1",
    });
  });

  it("leaves a schema of an unknown owner unbound", () => {
    const registry = new Map([["vault:record@1", "schemas/record.schema.yaml"]]);

    expect(
      resolveBinding(
        "records/foreign.yml",
        "_schema: other:config@1\n# yaml-language-server: $schema=fallback.yaml\n",
        RULES,
        registry,
      ),
    ).toEqual({ status: "unbound" });
  });

  it("leaves a valid schema field unbound when no registry is available", () => {
    expect(resolveBinding("records/q.yml", "_schema: other:config@1\n", RULES)).toEqual({
      status: "unbound",
    });
  });

  it("rejects a malformed schema identifier before considering fallback", () => {
    const text = "_schema: malformed\n# yaml-language-server: $schema=fallback.yaml\n";
    expect(resolveBinding("records/q.yml", text, RULES)).toMatchObject({
      status: "invalid",
      source: "schema-field",
      reference: "malformed",
      reason: "the schema identifier must have the form <owner>:<type>@<major>",
    });
  });

  it.each(["_schema:\n", '_schema: ""\n', "_schema: wrong value\n"])(
    "rejects the present malformed field %j without applying a path rule",
    (declaration) => {
      expect(resolveBinding("records/q.yml", declaration, RULES)).toMatchObject({
        status: "invalid",
        source: "schema-field",
        reason: "the schema identifier must have the form <owner>:<type>@<major>",
      });
    },
  );

  it.each(["a@b:c@1", "a:b:c@1"])("rejects the extra separator in %s", (identifier) => {
    expect(resolveBinding("q.yml", `_schema: ${identifier}\n`, [])).toMatchObject({
      status: "invalid",
      source: "schema-field",
    });
  });

  it("does not infer a known owner from a registry key without its separator", () => {
    expect(
      resolveBinding("q.yml", "_schema: tool:record@1\n", [], new Map([["tool", "s.yml"]])),
    ).toEqual({ status: "unbound" });
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
