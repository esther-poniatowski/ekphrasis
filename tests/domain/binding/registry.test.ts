import { describe, expect, it } from "vitest";
import { readSchemaRegistry, type JsonValue } from "../../../src/domain";

const reason = (value: JsonValue): string | null => {
  const reading = readSchemaRegistry(value);
  return reading.status === "malformed" ? reading.reason : null;
};

describe("schema registry", () => {
  it("reads version 1, which maps contracts only", () => {
    const reading = readSchemaRegistry({ schema_version: 1, schemas: { "a:b@1": "s/b.yaml" } });

    expect(reading).toMatchObject({ status: "read", registry: { version: 1 } });
    if (reading.status !== "read") return;
    expect([...reading.registry.schemas]).toEqual([["a:b@1", "s/b.yaml"]]);
    expect(reading.registry.resources.size).toBe(0);
  });

  it("reads a registry without schema_version as version 1", () => {
    expect(readSchemaRegistry({ schemas: {} })).toMatchObject({
      status: "read",
      registry: { version: 1 },
    });
  });

  it("reads the resources of version 2, keyed by absolute URIs written exactly", () => {
    const uri = "https://example.org/tool/note@1/base.schema.yaml";
    const reading = readSchemaRegistry({
      schema_version: 2,
      schemas: {},
      resources: { [uri]: ".schema-resources/tool/base.schema.yaml" },
    });

    expect(reading).toMatchObject({ status: "read", registry: { version: 2 } });
    if (reading.status !== "read") return;
    expect(reading.registry.resources.get(uri)).toBe(".schema-resources/tool/base.schema.yaml");
    expect(reading.registry.resources.get(`${uri}#`)).toBeUndefined();
  });

  it("reads version 2 without resources as mapping no URI", () => {
    const reading = readSchemaRegistry({ schema_version: 2, schemas: {} });

    expect(reading).toMatchObject({ status: "read", registry: { version: 2 } });
    if (reading.status === "read") expect(reading.registry.resources.size).toBe(0);
  });

  it.each<[string, JsonValue, string]>([
    ["no mapping", [], "has no schemas mapping"],
    ["no schemas", { schema_version: 2 }, "has no schemas mapping"],
    [
      "an unknown version",
      { schema_version: 3, schemas: {} },
      "declares the unsupported schema_version `3`",
    ],
    [
      "a version written as text",
      { schema_version: "2", schemas: {} },
      'declares the unsupported schema_version `"2"`',
    ],
    ["a non-path contract", { schemas: { "a:b@1": 1 } }, "contains a non-path value"],
    [
      "resources in version 1",
      { schema_version: 1, schemas: {}, resources: {} },
      "declares resources, which require schema_version 2",
    ],
    [
      "resources that are no mapping",
      { schema_version: 2, schemas: {}, resources: ["a"] },
      "has a resources key that holds no mapping",
    ],
    [
      "a non-path resource",
      { schema_version: 2, schemas: {}, resources: { "https://example.org/a": null } },
      "contains a non-path value",
    ],
    [
      "a relative resource key",
      { schema_version: 2, schemas: {}, resources: { "base.schema.yaml": "base.schema.yaml" } },
      "maps the resource `base.schema.yaml`, which is no absolute URI",
    ],
  ])("rejects %s", (_, value, expected) => {
    expect(reason(value)).toBe(expected);
  });
});
