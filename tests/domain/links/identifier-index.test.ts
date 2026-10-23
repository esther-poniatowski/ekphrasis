import { describe, expect, it } from "vitest";
import { IdentifierIndex } from "../../../src/domain";

describe("index of record identifiers", () => {
  it("resolves an identifier declared by one file", () => {
    const index = new IdentifierIndex();
    index.declare("questions/q.yml", "quest.pendulum");
    expect(index.resolve("quest.pendulum")).toEqual({ status: "found", path: "questions/q.yml" });
    expect(index.resolve("quest.other")).toEqual({ status: "absent" });
    expect(index.identifierOf("questions/q.yml")).toBe("quest.pendulum");
  });

  it("reports an identifier declared by several files as ambiguous, its files sorted", () => {
    const index = new IdentifierIndex();
    index.declare("notation/b.yml", "core");
    index.declare("glossary/a.yml", "core");
    expect(index.resolve("core")).toEqual({
      status: "ambiguous",
      paths: ["glossary/a.yml", "notation/b.yml"],
    });
    index.remove("notation/b.yml");
    expect(index.resolve("core")).toEqual({ status: "found", path: "glossary/a.yml" });
  });

  it("replaces the identifier of a changed file", () => {
    const index = new IdentifierIndex();
    index.declare("q.yml", "quest.old");
    index.declare("q.yml", "quest.new");
    expect(index.resolve("quest.old")).toEqual({ status: "absent" });
    expect(index.resolve("quest.new")).toEqual({ status: "found", path: "q.yml" });
    index.declare("q.yml", null);
    expect(index.resolve("quest.new")).toEqual({ status: "absent" });
    expect(index.size).toBe(0);
  });

  it("moves the identifier of a renamed file", () => {
    const index = new IdentifierIndex();
    index.declare("q.yml", "quest.a");
    index.rename("q.yml", "archive/q.yml");
    expect(index.resolve("quest.a")).toEqual({ status: "found", path: "archive/q.yml" });
    expect(index.identifierOf("q.yml")).toBeNull();
    index.rename("absent.yml", "other.yml");
    expect(index.identifierOf("other.yml")).toBeNull();
  });

  it("forgets every file when cleared", () => {
    const index = new IdentifierIndex();
    index.declare("a.yml", "a");
    index.declare("b.yml", "b");
    index.clear();
    expect(index.size).toBe(0);
    expect(index.resolve("a")).toEqual({ status: "absent" });
  });
});
