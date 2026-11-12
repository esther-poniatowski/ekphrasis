/** Form check of the opened record, for a file that an excluded path pattern leaves unbound. */
import { describe, expect, it } from "vitest";
import type { VaultInspector } from "../../src/application/diagnostic/ports";
import { recordChecks } from "../../src/application/diagnostic/record-checks";
import type { SchemaFacts } from "../../src/application/diagnostic/schema-checks";

const SKELETON = "templates/project.yml";

const FACTS: SchemaFacts = {
  registry: { status: "unconfigured" },
  identifiers: ["vault:project@1"],
  generatedPaths: new Set(),
};

const VAULT: VaultInspector = {
  isIndexedFile: () => true,
  isIndexedFolder: () => true,
  exists: () => Promise.resolve(true),
  modifiedAt: () => Promise.resolve(null),
  writeAccess: () => Promise.resolve({ status: "writable" }),
};

describe("record checks", () => {
  it("passes the form check of an excluded skeleton and names its pattern", async () => {
    const checks = await recordChecks(
      {
        path: SKELETON,
        text: "_schema: vault:project@1\nid: <identifier>\n",
        state: { status: "unbound", schemaPaths: [], excludedBy: "templates/**" },
      },
      FACTS,
      VAULT,
    );
    const form = checks.find((check) => check.id === "record.form");
    expect(form).toMatchObject({ status: "pass" });
    expect(form?.observed).toContain("`templates/**`");
  });

  it("still warns on a record that no binding source reaches", async () => {
    const checks = await recordChecks(
      {
        path: "notes/project.yml",
        text: "id: x\n",
        state: { status: "unbound", schemaPaths: [] },
      },
      FACTS,
      VAULT,
    );
    expect(checks.find((check) => check.id === "record.form")).toMatchObject({
      status: "warning",
    });
  });
});
