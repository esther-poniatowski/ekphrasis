import { describe, expect, it } from "vitest";
import {
  FieldLinkError,
  fieldLinkOfLinktext,
  fieldLinkOfQuery,
  fieldLinkOfUri,
  parseFieldLink,
  printIdentifierUri,
  printSubpath,
} from "../../../src/domain";

const byPath = (linkpath: string, field: (string | number)[]) => ({
  target: { kind: "path", linkpath },
  field,
});

const byIdentifier = (
  identifier: string,
  field: (string | number)[],
  vault: string | null = null,
) => ({
  target: { kind: "identifier", identifier, vault },
  field,
});

describe("field links by path", () => {
  it.each([
    [
      "[epistemic aim](../questions/intermittency.yml#task.epistemic_aim)",
      "../questions/intermittency.yml",
      ["task", "epistemic_aim"],
    ],
    ["[[intermittency.yml#task.epistemic_aim]]", "intermittency.yml", ["task", "epistemic_aim"]],
    [
      "[[intermittency.yml#task.epistemic_aim|aim]]",
      "intermittency.yml",
      ["task", "epistemic_aim"],
    ],
    [
      "[[intermittency#subject.foils[1].symbol]]",
      "intermittency",
      ["subject", "foils", 1, "symbol"],
    ],
    ["[second foil](q.yml#subject.foils[1])", "q.yml", ["subject", "foils", 1]],
    ['[[q.yml#maturity["task.aim"]]]', "q.yml", ["maturity", "task.aim"]],
    ["[[q.yml]]", "q.yml", []],
    ["[[#task.aim]]", "", ["task", "aim"]],
  ])("parses %s", (text, linkpath, field) => {
    expect(parseFieldLink(text)).toEqual(byPath(linkpath, field));
  });

  it("decodes the percent-encoded spaces of a Markdown link, on each side of the hash sign", () => {
    expect(parseFieldLink('[note](my%20records/q.yml#notes["a%20b"])')).toEqual(
      byPath("my records/q.yml", ["notes", "a b"]),
    );
  });

  it("keeps the spaces of a destination between angle brackets", () => {
    expect(parseFieldLink("[aim](<my records/q.yml#task.aim>)")).toEqual(
      byPath("my records/q.yml", ["task", "aim"]),
    );
  });

  it("keeps the brackets of the text of a Markdown link apart from its destination", () => {
    expect(parseFieldLink("[the [first] foil](q.yml#subject.foils[0])")).toEqual(
      byPath("q.yml", ["subject", "foils", 0]),
    );
  });

  it("splits a decoded link text at its first hash sign", () => {
    expect(fieldLinkOfLinktext("records/q.yml#task.epistemic_aim")).toEqual(
      byPath("records/q.yml", ["task", "epistemic_aim"]),
    );
    expect(fieldLinkOfLinktext("records/q.yml")).toEqual(byPath("records/q.yml", []));
  });

  it("returns no field link for an embed", () => {
    expect(parseFieldLink("![[q.yml#task.aim]]")).toBeNull();
  });

  it.each([
    ["[[q.yml#task.aim", "is not closed"],
    ["[aim](q.yml#task.aim", "must take the form"],
    ["[aim] (q.yml#task.aim)", "must take the form"],
    ["[aim](my records/q.yml#task.aim)", "holds a space"],
    ["[aim](q.yml#)", "no field path after its hash sign"],
    ["[[q.yml#]]", "no field path after its hash sign"],
    ["[aim](q.yml#task..aim)", "malformed field path"],
    ["[[q.yml#subject.foils[*].symbol]]", "holds a wildcard"],
    ["[[q.yml#terms.*]]", "holds a wildcard"],
    ["[aim](q.yml#task.%E0%A4%A)", "malformed percent-encoding"],
    ["q.yml#task.aim", "no Markdown link"],
  ])("rejects %s", (text, reason) => {
    expect(() => parseFieldLink(text)).toThrow(FieldLinkError);
    expect(() => parseFieldLink(text)).toThrow(reason);
  });
});

describe("field links by identifier", () => {
  it.each([
    [
      "obsidian://ekphrasis?id=quest.pendulum.sustained-oscillation&field=task.epistemic_aim",
      byIdentifier("quest.pendulum.sustained-oscillation", ["task", "epistemic_aim"]),
    ],
    [
      "obsidian://ekphrasis?vault=research&id=glossary&field=terms%5B%22a.b%22%5D",
      byIdentifier("glossary", ["terms", "a.b"], "research"),
    ],
    ["obsidian://ekphrasis?id=system.pendulum", byIdentifier("system.pendulum", [])],
    ["obsidian://Ekphrasis/?id=a&field=", byIdentifier("a", [])],
    ["obsidian://ekphrasis?id=a%2Bb&field=x&unknown=1", byIdentifier("a+b", ["x"])],
  ])("parses %s", (uri, link) => {
    expect(fieldLinkOfUri(uri)).toEqual(link);
  });

  it("parses a URI written as a Markdown link, as an autolink and bare", () => {
    const link = byIdentifier("a", ["task", "aim"]);
    expect(parseFieldLink("[aim](obsidian://ekphrasis?id=a&field=task.aim)")).toEqual(link);
    expect(parseFieldLink("<obsidian://ekphrasis?id=a&field=task.aim>")).toEqual(link);
    expect(parseFieldLink("obsidian://ekphrasis?id=a&field=task.aim")).toEqual(link);
  });

  it("returns no field link for another scheme or another action of Obsidian", () => {
    expect(parseFieldLink("[site](https://example.org/q.yml#task.aim)")).toBeNull();
    expect(fieldLinkOfUri("obsidian://open?vault=v&file=q.yml")).toBeNull();
  });

  it("reads the decoded parameters passed to a protocol handler", () => {
    expect(
      fieldLinkOfQuery({ action: "ekphrasis", id: "a", field: 'notes["x y"]', vault: "" }),
    ).toEqual(byIdentifier("a", ["notes", "x y"]));
  });

  it.each([
    ["obsidian://ekphrasis?field=task.aim", "names no record"],
    ["obsidian://ekphrasis?id=&field=task.aim", "names no record"],
    ["obsidian://ekphrasis", "names no record"],
    ["obsidian://ekphrasis?id=a&id=b", "repeats the parameter `id`"],
    ["obsidian://ekphrasis?id=a&field=task[", "malformed field path"],
    ["obsidian://ekphrasis?id=a&field=subject.foils%5B*%5D", "holds a wildcard"],
    ["obsidian://ekphrasis?id=%E0%A4%A", "malformed percent-encoding"],
  ])("rejects %s", (uri, reason) => {
    expect(() => fieldLinkOfUri(uri)).toThrow(FieldLinkError);
    expect(() => fieldLinkOfUri(uri)).toThrow(reason);
  });
});

describe("printing of field links", () => {
  it("prints the subpath of a field, empty for the root", () => {
    expect(printSubpath(["task", "epistemic_aim"])).toBe("#task.epistemic_aim");
    expect(printSubpath(["subject", "foils", 1])).toBe("#subject.foils[1]");
    expect(printSubpath([])).toBe("");
  });

  it("prints a URI of ekphrasis that parses back to the same link", () => {
    const uri = printIdentifierUri("quest.pendulum", ["maturity", "task.aim"], "my vault");
    expect(uri).toBe(
      "obsidian://ekphrasis?vault=my%20vault&id=quest.pendulum&field=maturity%5B%22task.aim%22%5D",
    );
    expect(fieldLinkOfUri(uri)).toEqual(
      byIdentifier("quest.pendulum", ["maturity", "task.aim"], "my vault"),
    );
    expect(printIdentifierUri("quest.pendulum", [])).toBe("obsidian://ekphrasis?id=quest.pendulum");
  });
});
