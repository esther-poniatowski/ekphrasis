import { describe, expect, it } from "vitest";
import { fieldLinkByIdentifier, fieldLinkByPath, type LinkFormatter } from "../../src/application";
import { buildFormModel, type FormModel } from "../../src/domain";
import { YamlDocumentParser } from "../../src/infrastructure";
import { schemaSet } from "../support/schemas";

/** Markdown links whose spaces are percent-encoded. */
const MARKDOWN: LinkFormatter = {
  linkTo: (path, subpath, alias) => `[${alias}](${`${path}${subpath}`.replace(/ /g, "%20")})`,
};

const WIKILINK: LinkFormatter = {
  linkTo: (path, subpath, alias) => `[[${path}${subpath}|${alias}]]`,
};

/** A link format that drops the brackets and the quotes of a subpath. */
const LOSSY: LinkFormatter = {
  linkTo: (path, subpath) => `[[${path}${subpath.replace(/[[\]"]/g, "")}]]`,
};

function model(): FormModel {
  const text =
    "task:\n  epistemic_aim: prediction\nfoils:\n  - name: laminar\n  - name: turbulent\n" +
    "notes:\n  a b: first\ngrid:\n  - [1, 2]\n";
  const schema = {
    type: "object",
    properties: {
      task: {
        type: "object",
        properties: { epistemic_aim: { title: "Epistemic aim", enum: ["prediction"] } },
      },
      foils: {
        title: "Foils",
        type: "array",
        items: { type: "object", properties: { name: { type: "string" } } },
      },
      grid: { type: "array", items: { type: "array", items: { type: "number" } } },
      notes: { type: "object", additionalProperties: { type: "string" } },
    },
  };
  return buildFormModel(
    schemaSet({ "s.json": schema }),
    new YamlDocumentParser().parse(text),
    text,
  );
}

describe("text of a link to a field", () => {
  it("writes a Markdown link with the label of the field as its text", () => {
    expect(fieldLinkByPath(MARKDOWN, "my records/q.yml", model(), "task.epistemic_aim")).toEqual({
      status: "link",
      text: "[Epistemic aim](my%20records/q.yml#task.epistemic_aim)",
    });
  });

  it("writes a wikilink to an item, whose text joins the label of its list and its position", () => {
    expect(fieldLinkByPath(WIKILINK, "q.yml", model(), "foils[1]")).toEqual({
      status: "link",
      text: "[[q.yml#foils[1]|Foils #2]]",
    });
  });

  it("labels an item of a list of lists by every list containing it", () => {
    expect(fieldLinkByPath(WIKILINK, "q.yml", model(), "grid[0][1]")).toEqual({
      status: "link",
      text: "[[q.yml#grid[0][1]|grid #1 #2]]",
    });
  });

  it("labels a field of an item by its own label", () => {
    expect(fieldLinkByPath(WIKILINK, "q.yml", model(), "foils[0].name")).toEqual({
      status: "link",
      text: "[[q.yml#foils[0].name|name]]",
    });
  });

  it("writes a key holding a space, which the Markdown link percent-encodes", () => {
    expect(fieldLinkByPath(MARKDOWN, "q.yml", model(), 'notes["a b"]')).toMatchObject({
      status: "link",
      text: '[a b](q.yml#notes["a%20b"])',
    });
  });

  it("refuses a link that the link format writes as another field", () => {
    const result = fieldLinkByPath(LOSSY, "q.yml", model(), "foils[0].name");
    expect(result).toEqual({
      status: "refused",
      reason:
        "The link format of Obsidian writes the link to the field `foils[0].name` as `[[q.yml#foils0.name]]`, which designates another field.",
    });
  });

  it("refuses a field absent from the form, or a malformed field path", () => {
    expect(fieldLinkByPath(MARKDOWN, "q.yml", model(), "task.missing")).toEqual({
      status: "refused",
      reason: "The form holds no field `task.missing`.",
    });
    expect(fieldLinkByPath(MARKDOWN, "q.yml", model(), "task..aim")).toMatchObject({
      status: "refused",
    });
  });
});

describe("text of a link by identifier to a field", () => {
  it("writes a Markdown link to a URI of ekphrasis, with the label of the field as its text", () => {
    expect(fieldLinkByIdentifier("quest.a", model(), "task.epistemic_aim")).toEqual({
      status: "link",
      text: "[Epistemic aim](obsidian://ekphrasis?id=quest.a&field=task.epistemic_aim)",
    });
  });

  it("percent-encodes the brackets and quotes of the field path, and labels an item by its list", () => {
    expect(fieldLinkByIdentifier("quest.a", model(), "foils[1]")).toEqual({
      status: "link",
      text: "[Foils #2](obsidian://ekphrasis?id=quest.a&field=foils%5B1%5D)",
    });
    expect(fieldLinkByIdentifier("quest.a", model(), 'notes["a b"]')).toEqual({
      status: "link",
      text: "[a b](obsidian://ekphrasis?id=quest.a&field=notes%5B%22a%20b%22%5D)",
    });
  });

  it("designates the root of an untitled record by a URI without a field, named by the identifier", () => {
    expect(fieldLinkByIdentifier("quest.a", model(), "")).toEqual({
      status: "link",
      text: "[quest.a](obsidian://ekphrasis?id=quest.a)",
    });
  });

  it("refuses a field absent from the form", () => {
    expect(fieldLinkByIdentifier("quest.a", model(), "task.missing")).toEqual({
      status: "refused",
      reason: "The form holds no field `task.missing`.",
    });
  });
});
