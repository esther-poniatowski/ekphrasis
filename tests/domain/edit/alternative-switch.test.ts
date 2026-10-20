/**
 * Switch of alternative: the keys of the previous alternative only are removed, and the removed
 * keys holding a filled value are listed for a confirmation.
 */
import { describe, expect, it } from "vitest";
import {
  buildFormModel,
  planAlternativeSwitch,
  type AlternativeSwitch,
  type JsonValue,
  type MappingField,
} from "../../../src/domain";
import { YamlDocumentParser } from "../../../src/infrastructure";
import { fieldAt } from "../../support/form-fields";
import { schemaSet } from "../../support/schemas";

const parser = new YamlDocumentParser();

const SCHEMA: JsonValue = {
  type: "object",
  "x-unfilled": ["open"],
  properties: {
    source: {
      oneOf: [
        {
          title: "Book",
          required: ["isbn"],
          properties: {
            isbn: { type: "string" },
            year: { type: "integer" },
            pages: { type: "array", items: { type: "string" } },
          },
        },
        {
          title: "Paper",
          required: ["doi"],
          properties: { doi: { type: "string" }, year: { type: "integer" } },
        },
      ],
    },
  },
};

const BOOK = 0;
const PAPER = 1;

/** Field `source` of the form of `text`. */
function source(text: string): MappingField {
  const model = buildFormModel(schemaSet({ "s.json": SCHEMA }), parser.parse(text), text);
  const field = fieldAt(model.root, "source");
  if (field.kind !== "alternatives") throw new Error(`Expected alternatives, got ${field.kind}.`);
  return field;
}

/** Keys removed by `change`, and the labels of the fields that it lists for a confirmation. */
function summary(change: AlternativeSwitch): { removed: unknown[]; lost: string[] } {
  return {
    removed: change.removals.map((removal) => removal.path.at(-1)),
    lost: change.lost.map((field) => field.label),
  };
}

describe("switch of alternative", () => {
  it("removes the keys of the previous alternative only, and lists those holding a value", () => {
    const field = source("source:\n  isbn: 978-0\n  year: 2020\n");
    expect(field.selectedAlternative).toBe(BOOK);
    const change = planAlternativeSwitch(field, BOOK, PAPER);
    expect(summary(change)).toEqual({ removed: ["isbn"], lost: ["isbn"] });
    expect(change.removals).toEqual([
      { kind: "remove-entry", path: ["source", "isbn"], emptyAsNull: true },
    ]);
  });

  it("removes the keys holding the null value, an unfilled value or an empty collection without listing them", () => {
    const field = source("source:\n  isbn: open\n  pages: []\n  year:\n");
    expect(summary(planAlternativeSwitch(field, BOOK, PAPER))).toEqual({
      removed: ["isbn", "pages"],
      lost: [],
    });
  });

  it("lists a collection holding a filled item, and a value of another shape", () => {
    const field = source("source:\n  isbn: {a: b}\n  pages: [open, p. 3]\n");
    expect(summary(planAlternativeSwitch(field, BOOK, PAPER))).toEqual({
      removed: ["isbn", "pages"],
      lost: ["isbn", "pages"],
    });
  });

  it("removes nothing from a displayed alternative whose keys are absent", () => {
    const field = source("source:\n  isbn: 978-0\n");
    expect(summary(planAlternativeSwitch(field, PAPER, BOOK))).toEqual({ removed: [], lost: [] });
  });

  it.each([
    ["the same alternative", BOOK, BOOK],
    ["no displayed alternative", null, PAPER],
    ["no chosen alternative", BOOK, null],
  ])("removes nothing when switching to %s", (_, from, to) => {
    const field = source("source:\n  isbn: 978-0\n");
    expect(summary(planAlternativeSwitch(field, from, to))).toEqual({ removed: [], lost: [] });
  });
});
