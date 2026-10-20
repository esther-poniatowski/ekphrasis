import { describe, expect, it } from "vitest";
import { ModeChoice } from "../../src/adapters/obsidian/views/view-mode";

describe("mode of the view of an instance", () => {
  it("follows the binding until the author chooses a mode", () => {
    const modes = new ModeChoice();
    expect(modes.displayed(false)).toBe("form");
    expect(modes.displayed(true)).toBe("source");
    modes.choose("form");
    expect(modes.displayed(true)).toBe("form");
  });

  it("keeps a source view chosen by the author when another file opens in the pane", () => {
    const modes = new ModeChoice();
    modes.choose("source");
    modes.fileOpened();
    expect(modes.displayed(false)).toBe("source");
    expect(modes.recorded).toBe("source");
    modes.choose("form");
    modes.fileOpened();
    expect(modes.displayed(true)).toBe("source");
    expect(modes.displayed(false)).toBe("form");
  });

  it("ends a source view shown for an unbound file or forced by a failure with its file", () => {
    const modes = new ModeChoice();
    modes.force("source");
    expect(modes.displayed(false)).toBe("source");
    expect(modes.recorded).toBeNull();
    modes.fileOpened();
    expect(modes.displayed(false)).toBe("form");
  });

  it("applies the mode restored from the workspace to the next file only, as a choice", () => {
    const modes = new ModeChoice();
    modes.restore("source");
    expect(modes.displayed(false)).toBe("form");
    modes.fileOpened();
    expect(modes.displayed(false)).toBe("source");
    modes.fileOpened();
    expect(modes.displayed(false)).toBe("source");
  });
});
