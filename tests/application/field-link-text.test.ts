import { describe, expect, it } from "vitest";
import { fieldLinkByPath, type LinkFormatter } from "../../src/application";
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
    "task:\n  epistemic_aim: prediction\nfoils:\n  - name: laminar\nnotes:\n  a b: first\n";
  const schema = {
    type: "object",
    properties: {
      task: {
        type: "object",
        properties: { epistemic_aim: { title: "Epistemic aim", enum: ["prediction"] } },
      },
      foils: {
        type: "array",
        items: { type: "object", properties: { name: { type: "string" } } },
      },
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

  it("writes a wikilink to an item, whose field path ends with a bracket", () => {
    expect(fieldLinkByPath(WIKILINK, "q.yml", model(), "foils[0]")).toEqual({
      status: "link",
      text: "[[q.yml#foils[0]|#1]]",
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
