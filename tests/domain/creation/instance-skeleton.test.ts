import { describe, expect, it } from "vitest";
import { instanceSkeleton } from "../../../src/domain";
import { view } from "../../support/schemas";

describe("instanceSkeleton", () => {
  it("keeps schema order and fills only defaults and required properties", () => {
    const schema = view({
      type: "object",
      required: ["_schema", "name", "state"],
      "x-unfilled": ["open"],
      properties: {
        name: { type: "string" },
        optional: { type: "string" },
        enabled: { type: "boolean", default: false },
        state: { enum: ["open", "done"] },
        _schema: { const: "project:record@1" },
      },
    });

    expect(instanceSkeleton(schema, "project:record@1")).toEqual({
      name: "open",
      enabled: false,
      state: "open",
      _schema: "project:record@1",
    });
  });

  it("uses a required constant before the null fallback", () => {
    const schema = view({
      required: ["kind", "title"],
      properties: {
        kind: { const: "question" },
        title: { type: ["string", "null"] },
      },
    });

    expect(instanceSkeleton(schema, "project:record@1")).toEqual({
      kind: "question",
      title: null,
    });
  });
});
