import { describe, expect, it } from "vitest";
import {
  buildFormModel,
  destinationText,
  fieldPathCompletions,
  parseFieldLink,
  subpathQueryAt,
  type FormModel,
} from "../../../src/domain";
import { YamlDocumentParser } from "../../../src/infrastructure";
import { schemaSet } from "../../support/schemas";

describe("field path typed in a Markdown link", () => {
  it("reads the path and the query after the hash sign of a link to a YAML file", () => {
    const line = "See [aim](../questions/my%20q.yml#task.ep";
    expect(subpathQueryAt(line)).toEqual({
      linkpath: "../questions/my q.yml",
      query: "task.ep",
      start: line.indexOf("#") + 1,
      angled: false,
    });
  });

  it("reads a destination enclosed in angle brackets, which may hold spaces", () => {
    const line = "[aim](<my records/q.yaml#";
    expect(subpathQueryAt(line)).toEqual({
      linkpath: "my records/q.yaml",
      query: "",
      start: line.length,
      angled: true,
    });
  });

  it.each([
    ["a link to a note", "[x](note.md#Head"],
    ["a link without its extension", "[x](guidance#subject"],
    ["a path before its hash sign", "[x](guidance.yml"],
    ["a wikilink", "[[guidance.yml#subject"],
    ["a closed destination", "[x](guidance.yml#a) and more"],
    ["a space outside angle brackets", "[x](guidance.yml#a b"],
    ["a closed angle bracket", "[x](<guidance.yml#a> b"],
    ["text without a link", "guidance.yml#subject"],
  ])("ignores %s", (_, line) => {
    expect(subpathQueryAt(line)).toBeNull();
  });
});

function model(): FormModel {
  const text = "task:\n  epistemic_aim: prediction\nfoils:\n  - name: laminar\n";
  const schema = {
    type: "object",
    properties: {
      task: {
        type: "object",
        properties: { epistemic_aim: { title: "Epistemic aim", type: "string" } },
      },
      foils: {
        type: "array",
        items: { type: "object", properties: { name: { type: "string" } } },
      },
    },
  };
  return buildFormModel(
    schemaSet({ "s.json": schema }),
    new YamlDocumentParser().parse(text),
    text,
  );
}

describe("field paths completing a link", () => {
  it("proposes every field of the instance in the order of the outline for an empty query", () => {
    expect(fieldPathCompletions(model(), "")).toEqual([
      { id: "task", trail: ["task"] },
      { id: "task.epistemic_aim", trail: ["task", "Epistemic aim"] },
      { id: "foils", trail: ["foils"] },
      { id: "foils[0]", trail: ["foils", "laminar"] },
      { id: "foils[0].name", trail: ["foils", "laminar", "name"] },
    ]);
  });

  it("proposes the paths starting with the query first, then those containing it or named by it", () => {
    expect(fieldPathCompletions(model(), "TASK.").map(({ id }) => id)).toEqual([
      "task.epistemic_aim",
    ]);
    expect(fieldPathCompletions(model(), "aim").map(({ id }) => id)).toEqual([
      "task.epistemic_aim",
    ]);
    expect(fieldPathCompletions(model(), "lam").map(({ id }) => id)).toEqual(["foils[0]"]);
    expect(fieldPathCompletions(model(), "name").map(({ id }) => id)).toEqual(["foils[0].name"]);
  });
});

describe("field path written in a destination", () => {
  it.each([
    ['notes["a b"]', false, 'notes["a%20b"]'],
    ['notes["a (b)"]', false, 'notes["a%20%28b%29"]'],
    ['notes["50%"]', false, 'notes["50%25"]'],
    ['notes["a b"]', true, 'notes["a b"]'],
    ['notes["<a>"]', true, 'notes["%3Ca%3E"]'],
  ])("writes %s, angled %s, as %s, which parses back", (id, angled, text) => {
    expect(destinationText(id, angled)).toBe(text);
    const destination = angled ? `<q.yml#${text}>` : `q.yml#${text}`;
    expect(parseFieldLink(`[x](${destination})`)?.field).toEqual(
      parseFieldLink(`[[q.yml#${id}]]`)?.field,
    );
  });
});
