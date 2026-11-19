/**
 * The schema of the presentation profile of a graph, which Ekphrasis publishes for its producers:
 * a profile with the recipes of the renderer is valid, and a recipe that Ekphrasis does not draw
 * is refused.
 */
import { readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const schema = JSON.parse(
  readFileSync(
    new URL("../../specs/schemas/graph-presentation.schema.json", import.meta.url),
    "utf8",
  ),
) as Record<string, unknown>;
const validate = new Ajv2020({ strict: false }).compile(schema);

const PROFILE = {
  profile: "inquiry",
  version: 2,
  layouts: { recommended: "layered", compatible: ["layered", "force"] },
  categories: [{ id: "claim", title: "Claim", shape: "box", marker: "C", style: "accent" }],
  node_kinds: [
    {
      id: "question",
      category: "claim",
      title: "Question",
      icon: "help",
      marker: "Q",
      style: "plain",
    },
  ],
  edge_kinds: [
    {
      id: "supports",
      title: "Supports",
      layer: "logic",
      style: "solid",
      arrow: "diamond",
      caption: "hide",
    },
    { id: "cites", title: "Cites", layer: "sources", style: "dashed" },
  ],
};

describe("the schema of the graph presentation profile", () => {
  it("is published under its absolute $id", () => {
    expect(schema["$id"]).toBe(
      "https://github.com/esther-poniatowski/ekphrasis/specs/schemas/graph-presentation.schema.json",
    );
  });

  it("admits the recipes that Ekphrasis draws", () => {
    expect(validate(PROFILE)).toBe(true);
  });

  it.each([
    ["an unknown arrow", { arrow: "star" }],
    ["an unknown caption", { caption: "bold" }],
    ["an unknown key", { width: 2 }],
  ])("refuses %s on an edge kind", (_label, extra) => {
    const [first, ...rest] = PROFILE.edge_kinds;
    expect(validate({ ...PROFILE, edge_kinds: [{ ...first, ...extra }, ...rest] })).toBe(false);
  });
});
