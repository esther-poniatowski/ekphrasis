import { describe, expect, it } from "vitest";
import {
  EntryIndex,
  entryIdentifiers,
  referenceDeclaration,
  referenceDefects,
  unknownEntryMessage,
  type EntryReference,
  type JsonValue,
} from "../../../src/domain";
import { view } from "../../support/schemas";

const declared = (keyword: JsonValue) =>
  referenceDeclaration(view({ type: "string", "x-reference": keyword }));

const KEYS: EntryReference = { schema: "ex:catalog@1", collection: ["streams"], key: null };
const BY_ID: EntryReference = { schema: "ex:team@1", collection: ["members"], key: ["id"] };

describe("declaration of a reference", () => {
  it("reads the contract, the collection and the optional key", () => {
    expect(declared({ schema: "ex:catalog@1", collection: "streams" })).toEqual({
      status: "declared",
      reference: KEYS,
    });
    expect(declared({ schema: "ex:team@1", collection: "groups.all", key: "who.id" })).toEqual({
      status: "declared",
      reference: { schema: "ex:team@1", collection: ["groups", "all"], key: ["who", "id"] },
    });
    expect(referenceDeclaration(view({ type: "string" }))).toEqual({ status: "absent" });
  });

  it.each<[string, JsonValue, string]>([
    ["a text", "ex:catalog@1#streams", "must hold a mapping"],
    ["an unknown key", { schema: "ex:a@1", collection: "s", field: "id" }, "unknown keys `field`"],
    [
      "a path in place of the contract",
      { schema: "a.schema.yaml", collection: "s" },
      "`<owner>:<type>@<major>`",
    ],
    ["no collection", { schema: "ex:a@1" }, "under `collection` a field path"],
    ["the root as collection", { schema: "ex:a@1", collection: "" }, "not their root"],
    [
      "a wildcard collection",
      { schema: "ex:a@1", collection: "groups[*].streams" },
      "wildcard path",
    ],
    ["a malformed key", { schema: "ex:a@1", collection: "s", key: "a..b" }, "no field path"],
  ])("reports a keyword holding %s", (_, keyword, reason) => {
    const declaration = declared(keyword);
    expect(declaration.status).toBe("defective");
    expect(declaration.status === "defective" && declaration.message).toContain(reason);
  });

  it("reports a malformed keyword once per field schema, at its first pattern path", () => {
    const root = view({
      type: "object",
      $defs: { stream: { type: "string", "x-reference": { schema: "nope" } } },
      properties: {
        main: { $ref: "#/$defs/stream" },
        other: { $ref: "#/$defs/stream" },
        sessions: {
          type: "array",
          items: {
            type: "object",
            properties: { s: { type: "string", "x-reference": { collection: "s" } } },
          },
        },
      },
    });
    expect(referenceDefects(root).map(({ path }) => path)).toEqual(["main", "sessions[*].s"]);
  });
});

describe("entries of a record", () => {
  it("names the entries of a mapping by their keys, and the items of a sequence by their text", () => {
    expect(entryIdentifiers({ streams: { research: {}, teaching: null } }, KEYS)).toEqual([
      "research",
      "teaching",
    ]);
    expect(entryIdentifiers({ streams: ["research", 3, "", "teaching"] }, KEYS)).toEqual([
      "research",
      "teaching",
    ]);
  });

  it("names each entry by the text at its key, in a sequence or in a mapping", () => {
    const sequence = { members: [{ id: "ana" }, { id: 7 }, { name: "no id" }, { id: "ben" }] };
    expect(entryIdentifiers(sequence, BY_ID)).toEqual(["ana", "ben"]);
    expect(entryIdentifiers({ members: { a: { id: "ana" }, b: { id: "ben" } } }, BY_ID)).toEqual([
      "ana",
      "ben",
    ]);
  });

  it("finds no entry when the collection is absent or holds a scalar", () => {
    expect(entryIdentifiers({}, KEYS)).toEqual([]);
    expect(entryIdentifiers({ streams: "research" }, KEYS)).toEqual([]);
    expect(entryIdentifiers(null, KEYS)).toEqual([]);
  });

  it("gathers the entries of every record bound to the contract, each once", () => {
    const index = new EntryIndex();
    index.declare("b.yml", {
      contract: "ex:catalog@1",
      value: { streams: { teaching: {}, admin: {} } },
    });
    index.declare("a.yml", {
      contract: "ex:catalog@1",
      value: { streams: { research: {}, admin: {} } },
    });
    index.declare("c.yml", { contract: "ex:other@1", value: { streams: { leisure: {} } } });
    expect(index.entries(KEYS)).toEqual({
      records: 2,
      identifiers: ["research", "admin", "teaching"],
    });
    index.remove("a.yml");
    index.declare("b.yml", null);
    expect(index.entries(KEYS)).toEqual({ records: 0, identifiers: [] });
  });
});

describe("message of an unknown entry", () => {
  it("names the collection, the key and the contract, or the absence of any record", () => {
    expect(unknownEntryMessage("admin", KEYS, { records: 1, identifiers: ["admin"] })).toBeNull();
    expect(unknownEntryMessage("leisure", KEYS, { records: 1, identifiers: ["admin"] })).toBe(
      "`leisure` names no entry of `streams`, in the records bound to `ex:catalog@1`.",
    );
    expect(unknownEntryMessage("cy", BY_ID, { records: 2, identifiers: [] })).toBe(
      "`cy` names no entry of `members`, identified by `id`, in the records bound to `ex:team@1`.",
    );
    expect(unknownEntryMessage("cy", BY_ID, { records: 0, identifiers: [] })).toBe(
      "No record bound to `ex:team@1` is found in the vault, so `cy` names no entry.",
    );
  });
});
