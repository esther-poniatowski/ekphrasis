import { describe, expect, it } from "vitest";
import {
  buildFormModel,
  planCommit,
  REFUSALS,
  type CommitPlan,
  type JsonValue,
  type ScalarValue,
  type YamlPath,
} from "../../../src/domain";
import { YamlDocumentParser } from "../../../src/infrastructure";
import { schemaSet } from "../../support/schemas";

const parser = new YamlDocumentParser();

const SCHEMA: JsonValue = {
  type: "object",
  required: ["title", "status"],
  "x-unfilled": ["open"],
  properties: {
    title: { type: "string" },
    status: { enum: ["posed", "open"] },
    note: { type: "string", "x-kind": "markdown" },
    count: { type: "integer" },
    check: {
      type: "object",
      properties: { verdict: { type: "string" }, evidence: { type: "string" } },
    },
    tags: { type: "array", items: { type: "string" } },
    nominal: { type: "number" },
    copy: { type: "number" },
  },
};

function plan(text: string, path: YamlPath, value: ScalarValue, schema = SCHEMA): CommitPlan {
  const model = buildFormModel(schemaSet({ "s.json": schema }), parser.parse(text), text);
  return planCommit(model, text, { path, value });
}

describe("plan of a commit", () => {
  it("leaves the text unchanged when the field holds the committed value", () => {
    expect(plan("title: a\nstatus: posed\n", ["title"], "a")).toEqual({ status: "unchanged" });
    expect(plan("title: a\nstatus: posed\n", ["note"], null)).toEqual({ status: "unchanged" });
  });

  it("rewrites the token of a present value, at its offset, in the selected style", () => {
    const result = plan('title: "a" # c\nstatus: posed\n', ["title"], "b: c");
    expect(result).toMatchObject({
      status: "planned",
      edits: [
        {
          kind: "rewrite",
          offset: 7,
          scalar: { text: "b: c", style: "double-quoted", context: "after-key" },
        },
      ],
    });
  });

  it("rewrites a value inside a flow mapping in the flow context", () => {
    const result = plan(
      "title: a\nstatus: posed\ncheck: {verdict: x}\n",
      ["check", "verdict"],
      "a, b",
    );
    expect(result).toMatchObject({
      status: "planned",
      edits: [{ kind: "rewrite", scalar: { style: "single-quoted", context: "flow" } }],
    });
  });

  it("fills an empty value after the colon, splitting a block scalar around a comment", () => {
    const text = "title: a\nstatus: posed\nnote: # write here\n";
    const colon = text.indexOf("note:") + "note".length;
    const result = plan(text, ["note"], "one\ntwo\n");
    expect(result).toMatchObject({
      status: "planned",
      edits: [
        {
          kind: "splice",
          range: { start: colon + 1, end: colon + 1 },
          parts: [" ", { piece: "header" }],
        },
        {
          kind: "splice",
          range: { start: text.length, end: text.length },
          parts: ["", { piece: "body" }],
        },
      ],
    });
  });

  it("writes the first unfilled value when a required field is cleared", () => {
    const result = plan("title: a\nstatus: posed\n", ["status"], null);
    expect(result).toMatchObject({
      status: "planned",
      edits: [{ kind: "rewrite", scalar: { text: "open", style: "plain" } }],
    });
  });

  it("erases the value of a cleared required field when the schema has no unfilled value", () => {
    const schema = {
      type: "object",
      required: ["title"],
      properties: { title: { type: "string" } },
    };
    const result = plan("title: a # c\nb: 1\n", ["title"], null, schema);
    expect(result).toMatchObject({
      status: "planned",
      edits: [{ kind: "splice", range: { start: 7, end: 8 }, parts: [] }],
    });
  });

  it("removes the lines of a cleared optional key, keeping its comment", () => {
    const text = "title: a\nnote: x # kept\nstatus: posed\n";
    const result = plan(text, ["note"], null);
    expect(result).toMatchObject({
      status: "planned",
      edits: [{ kind: "splice", range: { start: 9, end: 24 }, parts: ["# kept\n"] }],
    });
  });

  it("inserts an absent key after the nearest preceding key of the schema, wherever it stands", () => {
    // The schema orders title, status, note: the key note follows status, the first line here.
    const text = "status: posed\ntitle: a\ncount: 1\n";
    const result = plan(text, ["note"], "n");
    const after = text.indexOf("title");
    expect(result).toMatchObject({
      status: "planned",
      edits: [{ kind: "splice", range: { start: after, end: after } }],
    });
  });

  it("refuses a value reached through an alias, and a value of another shape", () => {
    const text = "title: a\nstatus: posed\nnominal: &g 9.8\ncopy: *g\ncount: [1]\n";
    expect(plan(text, ["copy"], 1)).toEqual({ status: "refused", reason: REFUSALS.locked });
    expect(plan(text, ["count"], 1)).toEqual({ status: "refused", reason: REFUSALS.mismatch });
  });

  it("refuses to add or remove a key of a flow mapping, and to clear an item", () => {
    const text = "title: a\nstatus: posed\ncheck: {verdict: x, evidence: y}\ntags: [p]\n";
    expect(plan(text, ["check", "evidence"], null)).toEqual({
      status: "refused",
      reason: REFUSALS.flow,
    });
    const absent = "title: a\nstatus: posed\ncheck: {verdict: x}\n";
    expect(plan(absent, ["check", "evidence"], "y")).toEqual({
      status: "refused",
      reason: REFUSALS.flow,
    });
    expect(plan(text, ["tags", 0], null)).toEqual({ status: "refused", reason: REFUSALS.item });
  });

  it("refuses a path that designates no field", () => {
    expect(plan("title: a\n", ["missing"], "x")).toEqual({
      status: "refused",
      reason: REFUSALS.missing,
    });
  });
});
