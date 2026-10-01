import { describe, expect, it, vi } from "vitest";
import {
  refusalNotice,
  registerExtensions,
} from "../../src/adapters/obsidian/extension-registration";

describe("registration of the YAML extensions", () => {
  it("registers each extension on its own, and returns the refused ones", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const registered: string[] = [];
    const refused = registerExtensions(["yaml", "yml"], ([extension]) => {
      if (extension === "yaml")
        throw new Error("Attempting to register an existing file extension");
      registered.push(extension ?? "");
    });

    expect(refused).toEqual(["yaml"]);
    expect(registered).toEqual(["yml"]);
  });

  it("names the extensions, the candidate owners and the command", () => {
    const text = refusalNotice(["yaml", "yml"], "Open in ekphrasis");

    expect(text).toContain(".yaml and .yml");
    expect(text).toContain("YAML Editor or YAML Databases");
    expect(text).toContain('"Open in ekphrasis"');
  });
});
