import { describe, expect, it } from "vitest";
import { extensionOf, folderOf, isUri, resolveVaultPath } from "../../../src/domain";

describe("vault paths", () => {
  it("finds the folder and the extension of a file", () => {
    expect(folderOf("records/question.yml")).toBe("records");
    expect(folderOf("question.yml")).toBe("");
    expect(extensionOf("schemas/term.schema.YAML")).toBe("yaml");
    expect(extensionOf("schemas/.hidden")).toBe("");
    expect(extensionOf("folder.d/README")).toBe("");
  });

  it("resolves relative and rooted references", () => {
    expect(resolveVaultPath("records/a", "../schemas/q.yaml")).toBe("records/schemas/q.yaml");
    expect(resolveVaultPath("records", "./q.yaml")).toBe("records/q.yaml");
    expect(resolveVaultPath("records", "/schemas/q.yaml")).toBe("schemas/q.yaml");
  });

  it("refuses a reference that climbs above the vault root", () => {
    expect(resolveVaultPath("records", "../../q.yaml")).toBeNull();
  });

  it("recognizes absolute URIs", () => {
    expect(isUri("https://example.org/a.json")).toBe(true);
    expect(isUri("../a.json")).toBe(false);
  });
});
