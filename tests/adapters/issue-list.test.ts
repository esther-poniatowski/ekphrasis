import { describe, expect, it } from "vitest";
import { countPhrase, fieldMark } from "../../src/adapters/obsidian/ui/issue-list";
import { issue } from "../../src/domain";

describe("display of issues", () => {
  it.each([
    [{ missing: 0, invalid: 0, warning: 0 }, "no issue"],
    [{ missing: 1, invalid: 0, warning: 0 }, "1 missing field"],
    [{ missing: 2, invalid: 1, warning: 0 }, "2 missing fields and 1 invalid value"],
    [{ missing: 1, invalid: 2, warning: 3 }, "1 missing field, 2 invalid values and 3 warnings"],
  ])("counts %j as %s", (counts, phrase) => {
    expect(countPhrase(counts)).toBe(phrase);
  });

  it("marks a field by its invalid values first, then by its missing state", () => {
    const missing = issue(["a"], "required", "Missing.", { missing: true });
    const invalid = issue(["a"], "enum", "Invalid.");
    const warning = issue(["a"], "word-count", "Long.", { severity: "warning" });
    expect(fieldMark([warning, missing, invalid])).toBe("invalid");
    expect(fieldMark([warning, missing])).toBe("missing");
    expect(fieldMark([warning])).toBe("warning");
    expect(fieldMark([])).toBeNull();
  });
});
