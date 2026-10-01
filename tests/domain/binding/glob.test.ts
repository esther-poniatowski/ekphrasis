import { describe, expect, it } from "vitest";
import { GlobPattern } from "../../../src/domain";

const matches = (pattern: string, path: string): boolean => new GlobPattern(pattern).matches(path);

describe("glob patterns", () => {
  it("matches any folder depth with a globstar segment, including none", () => {
    expect(matches("**/glossary.yml", "glossary.yml")).toBe(true);
    expect(matches("**/glossary.yml", "a/b/glossary.yml")).toBe(true);
    expect(matches("**/glossary.yml", "a/b/my-glossary.yml")).toBe(false);
    expect(matches("records/**", "records/a/b.yml")).toBe(true);
  });

  it("keeps a single star within one segment", () => {
    expect(matches("records/*.yml", "records/q.yml")).toBe(true);
    expect(matches("records/*.yml", "records/a/q.yml")).toBe(false);
    expect(matches("**/*.glossary.yml", "x/pendulum.glossary.yml")).toBe(true);
  });

  it("matches alternatives, nested alternatives and classes", () => {
    expect(matches("*.{yml,yaml}", "q.yaml")).toBe(true);
    expect(matches("{a,b{c,d}}.yml", "bd.yml")).toBe(true);
    expect(matches("q[0-9].yml", "q7.yml")).toBe(true);
    expect(matches("q[!0-9].yml", "q7.yml")).toBe(false);
    expect(matches("q?.yml", "q/.yml")).toBe(false);
  });

  it("treats regular expression characters and escapes as literals", () => {
    expect(matches("a+b(1).yml", "a+b(1).yml")).toBe(true);
    expect(matches("a.yml", "aXyml")).toBe(false);
    expect(matches("\\*.yml", "*.yml")).toBe(true);
    expect(matches("\\*.yml", "q.yml")).toBe(false);
  });

  it("ignores a leading slash and matches the whole path", () => {
    expect(matches("/records/q.yml", "records/q.yml")).toBe(true);
    expect(matches("q.yml", "records/q.yml")).toBe(false);
  });

  it("reads an unclosed brace or bracket as a literal", () => {
    expect(matches("a{b.yml", "a{b.yml")).toBe(true);
    expect(matches("a[b.yml", "a[b.yml")).toBe(true);
  });
});
