import { describe, expect, it } from "vitest";
import { TextDraft } from "../../src/adapters/obsidian/ui/controls/text-draft";
import { valueFromText } from "../../src/domain";

const textDraft = (value: string | number | null): TextDraft =>
  new TextDraft(value, (text) => valueFromText("text", text));
const numberDraft = (value: number | null): TextDraft =>
  new TextDraft(value, (text) => valueFromText("number", text));

describe("draft of a text control", () => {
  it("commits the typed text once, and nothing when the author typed nothing", () => {
    const draft = textDraft("a");
    expect(draft.take()).toBeNull();
    draft.focus();
    draft.input("ab");
    expect(draft.take()).toEqual({ value: "ab" });
    expect(draft.take()).toBeNull();
  });

  it("commits the empty text as a cleared field", () => {
    const draft = textDraft("a");
    draft.input("");
    expect(draft.take()).toEqual({ value: null });
  });

  it("keeps the uncommitted text of a focused control through a change made outside", () => {
    const draft = textDraft("a");
    draft.focus();
    draft.input("typed");
    draft.update("changed outside");

    expect(draft.displayed).toBe("typed");
    draft.blur();
    expect(draft.take()).toEqual({ value: "typed" });
  });

  it("follows a change made outside when it holds no uncommitted text", () => {
    const draft = textDraft("a");
    draft.focus();
    draft.update("changed outside");
    expect(draft.displayed).toBe("changed outside");
    expect(draft.take()).toBeNull();
  });

  it("keeps a focused text that reads as the committed value", () => {
    const draft = numberDraft(1);
    draft.focus();
    draft.input("1.50");
    expect(draft.take()).toEqual({ value: 1.5 });
    draft.update(1.5);
    expect(draft.displayed).toBe("1.50");

    draft.blur();
    expect(draft.displayed).toBe("1.5");
    draft.update(2);
    expect(draft.displayed).toBe("2");
  });

  it("keeps the text of a refused commit until the value of the field changes", () => {
    const draft = textDraft("a");
    draft.input("refused");
    draft.take();
    draft.blur();
    draft.update("a");
    expect(draft.displayed).toBe("refused");

    draft.update("b");
    expect(draft.displayed).toBe("b");
  });
});
