import { describe, expect, it } from "vitest";
import { resolveBinding, type PathRule } from "../../../src/domain";

const RULES: readonly PathRule[] = [
  { pattern: "", schema: "ignored.schema.yaml" },
  { pattern: "records/**/*.yml", schema: "schemas/record.schema.yaml" },
  { pattern: "records/q.yml", schema: "schemas/second.schema.yaml" },
];

describe("schema binding", () => {
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
