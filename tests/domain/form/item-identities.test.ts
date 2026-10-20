import { describe, expect, it } from "vitest";
import { ItemIdentities } from "../../../src/domain";

describe("identifiers of sequence items", () => {
  it("keeps the identifiers of a sequence by position, and reserves one for its next item", () => {
    const identities = new ItemIdentities();
    const first = identities.of("tags", 2);
    expect(identities.of("tags", 2)).toEqual(first);
    expect(first.items).toHaveLength(2);
    expect(first.items).not.toContain(first.next);
  });

  it("gives the item appended at the end the identifier reserved for the next item", () => {
    const identities = new ItemIdentities();
    const { next } = identities.of("tags", 1);
    identities.apply("tags", { kind: "insert", index: 1 });
    const after = identities.of("tags", 2);
    expect(after.items[1]).toBe(next);
    expect(after.next).not.toBe(next);
  });

  it("follows a move, a removal and an insertion inside the sequence", () => {
    const identities = new ItemIdentities();
    const [a, b, c] = identities.of("rows", 3).items;
    identities.apply("rows", { kind: "move", from: 2, to: 0 });
    expect(identities.of("rows", 3).items).toEqual([c, a, b]);
    identities.apply("rows", { kind: "remove", index: 1 });
    expect(identities.of("rows", 2).items).toEqual([c, b]);
    identities.apply("rows", { kind: "insert", index: 0 });
    const [inserted, ...rest] = identities.of("rows", 3).items;
    expect(rest).toEqual([c, b]);
    expect([a, b, c]).not.toContain(inserted);
  });

  it("adapts to a sequence whose length changed outside the form", () => {
    const identities = new ItemIdentities();
    const [a] = identities.of("tags", 2).items;
    expect(identities.of("tags", 1).items).toEqual([a]);
    expect(identities.of("tags", 3).items[0]).toBe(a);
  });
});
