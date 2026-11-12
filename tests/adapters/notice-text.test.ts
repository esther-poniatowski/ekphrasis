// @vitest-environment happy-dom
/** Text of an Obsidian notice, whose backtick spans display as code. */
import { describe, expect, it } from "vitest";
import { noticeText } from "../../src/adapters/obsidian/notice-text";

describe("notice text", () => {
  it("displays each span between backticks as code", () => {
    const fragment = noticeText("Ekphrasis: the file `notes/a.yml` no longer exists.");
    expect(fragment.textContent).toBe("Ekphrasis: the file notes/a.yml no longer exists.");
    expect(Array.from(fragment.querySelectorAll("code"), (code) => code.textContent)).toEqual([
      "notes/a.yml",
    ]);
  });

  it("keeps a text without code spans and its line breaks unchanged", () => {
    const text = "Ekphrasis: several files declare it:\n- a.yml\n- b.yml";
    const fragment = noticeText(text);
    expect(fragment.textContent).toBe(text);
    expect(fragment.querySelectorAll("code")).toHaveLength(0);
  });
});
