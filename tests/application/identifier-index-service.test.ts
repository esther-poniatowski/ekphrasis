import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  IdentifierIndexService,
  type EkphrasisSettings,
  type FileSource,
} from "../../src/application";
import { FileSchemaLoader, YamlDocumentParser } from "../../src/infrastructure";
import { DirectoryFileSource, FIXTURE_RULES, MemoryFileSource } from "../support/fixture-vault";
import { FIXTURES_ROOT } from "../support/yaml-files";

const RECORD_SCHEMA = [
  "type: object",
  "x-identifier: id",
  "properties:",
  "  id: { type: string }",
  "",
].join("\n");

const NESTED_SCHEMA = [
  "type: object",
  "x-identifier: identity.id",
  "properties:",
  "  identity:",
  "    type: object",
  "    properties:",
  "      id: { type: string }",
  "",
].join("\n");

const MODELINE = (schema: string): string => `# yaml-language-server: $schema=${schema}\n`;

/** Index over the files of `vault`, a mutable map of vault paths to texts. */
function service(
  vault: Record<string, string>,
  settings: () => EkphrasisSettings = () => DEFAULT_SETTINGS,
  files: FileSource = new MemoryFileSource(vault),
): IdentifierIndexService {
  return new IdentifierIndexService(
    new YamlDocumentParser(),
    files,
    new FileSchemaLoader(files),
    settings,
  );
}

describe("IdentifierIndexService", () => {
  it("indexes the identifier at the field path named by the bound schema", async () => {
    const vault = {
      "s/record.schema.yaml": RECORD_SCHEMA,
      "s/project.schema.yaml": NESTED_SCHEMA,
      "q/a.yml": `${MODELINE("../s/record.schema.yaml")}id: quest.a\n`,
      "p/b.yml": `${MODELINE("../s/project.schema.yaml")}identity:\n  id: project-b\n`,
    };
    const index = service(vault);
    await index.rebuild(["q/a.yml", "p/b.yml"]);

    expect(index.resolve("quest.a")).toEqual({ status: "found", path: "q/a.yml" });
    expect(index.resolve("project-b")).toEqual({ status: "found", path: "p/b.yml" });
  });

  it("binds a file without modeline through the path rules of the current settings", async () => {
    const vault = { "record.schema.yaml": RECORD_SCHEMA, "q/a.yml": "id: quest.a\n" };
    let settings = DEFAULT_SETTINGS;
    const index = service(vault, () => settings);
    await index.rebuild(["q/a.yml"]);
    expect(index.resolve("quest.a")).toEqual({ status: "absent" });

    settings = { ...settings, pathRules: [{ pattern: "q/*.yml", schema: "record.schema.yaml" }] };
    await index.rebuild(["q/a.yml"]);
    expect(index.resolve("quest.a")).toEqual({ status: "found", path: "q/a.yml" });
  });

  it("declares no identifier for an unbound, unparsable or undeclaring file", async () => {
    const vault = {
      "record.schema.yaml": RECORD_SCHEMA,
      "plain.schema.yaml": "type: object\nproperties:\n  id: { type: string }\n",
      "unbound.yml": "id: quest.unbound\n",
      "broken.yml": `${MODELINE("record.schema.yaml")}id: [quest.broken\n`,
      "plain.yml": `${MODELINE("plain.schema.yaml")}id: quest.plain\n`,
      "missing.yml": `${MODELINE("absent.schema.yaml")}id: quest.missing\n`,
      "remote.yml": `${MODELINE("https://example.org/s.json")}id: quest.remote\n`,
    };
    const index = service(vault);
    await index.rebuild(Object.keys(vault).filter((path) => !path.includes("schema")));

    for (const path of ["unbound", "broken", "plain", "missing", "remote"]) {
      expect(index.resolve(`quest.${path}`)).toEqual({ status: "absent" });
    }
  });

  it("reports an identifier declared by two files, even of two types, as ambiguous", async () => {
    const vault = {
      "record.schema.yaml": RECORD_SCHEMA,
      "project.schema.yaml": NESTED_SCHEMA,
      "a.yml": `${MODELINE("record.schema.yaml")}id: core\n`,
      "b.yml": `${MODELINE("project.schema.yaml")}identity: { id: core }\n`,
    };
    const index = service(vault);
    await index.rebuild(["b.yml", "a.yml"]);
    expect(index.resolve("core")).toEqual({ status: "ambiguous", paths: ["a.yml", "b.yml"] });
  });

  it("follows the creation, change, rename and deletion of a file", async () => {
    const vault: Record<string, string> = { "record.schema.yaml": RECORD_SCHEMA };
    const index = service(vault, () => ({
      ...DEFAULT_SETTINGS,
      pathRules: [{ pattern: "records/**", schema: "record.schema.yaml" }],
    }));
    await index.rebuild([]);

    vault["records/a.yml"] = "id: quest.a\n";
    await index.indexFile("records/a.yml");
    expect(index.resolve("quest.a")).toEqual({ status: "found", path: "records/a.yml" });

    vault["records/a.yml"] = "id: quest.renamed\n";
    await index.indexFile("records/a.yml");
    expect(index.resolve("quest.a")).toEqual({ status: "absent" });
    expect(index.identifierOf("records/a.yml")).toBe("quest.renamed");

    // A rename out of the folder of the path rule leaves the file unbound.
    vault["archive/a.yml"] = vault["records/a.yml"] ?? "";
    delete vault["records/a.yml"];
    await index.renameFile("records/a.yml", "archive/a.yml");
    expect(index.resolve("quest.renamed")).toEqual({ status: "absent" });

    vault["records/b.yml"] = vault["archive/a.yml"] ?? "";
    delete vault["archive/a.yml"];
    await index.renameFile("archive/a.yml", "records/b.yml");
    expect(index.resolve("quest.renamed")).toEqual({ status: "found", path: "records/b.yml" });

    delete vault["records/b.yml"];
    index.removeFile("records/b.yml");
    expect(index.resolve("quest.renamed")).toEqual({ status: "absent" });
  });

  it("indexes again the files bound to a schema when one of its files changes", async () => {
    const vault: Record<string, string> = {
      "record.schema.yaml": "type: object\nproperties:\n  id: { $ref: common.schema.yaml }\n",
      "common.schema.yaml": "type: string\n",
      "a.yml": `${MODELINE("record.schema.yaml")}id: quest.a\nkey: other\n`,
    };
    const index = service(vault);
    await index.rebuild(["a.yml"]);
    expect(index.identifierOf("a.yml")).toBeNull();

    vault["record.schema.yaml"] = `x-identifier: id\n${vault["record.schema.yaml"] ?? ""}`;
    await index.dependencyChanged("record.schema.yaml");
    expect(index.identifierOf("a.yml")).toBe("quest.a");

    vault["record.schema.yaml"] = [
      "x-identifier: key",
      "type: object",
      "properties:",
      "  id: { $ref: common.schema.yaml }",
      "  key: { type: string }",
      "",
    ].join("\n");
    // A change reported for a referenced schema file loads the whole schema set again.
    await index.dependencyChanged("common.schema.yaml");
    expect(index.identifierOf("a.yml")).toBe("other");
  });

  it("indexes a file again once its missing schema is created", async () => {
    const vault: Record<string, string> = {
      "a.yml": `${MODELINE("record.schema.yaml")}id: quest.a\n`,
    };
    const index = service(vault);
    await index.rebuild(["a.yml"]);
    expect(index.identifierOf("a.yml")).toBeNull();

    vault["record.schema.yaml"] = RECORD_SCHEMA;
    await index.dependencyChanged("record.schema.yaml");
    expect(index.identifierOf("a.yml")).toBe("quest.a");
  });

  it("loads each schema once across the files bound to it", async () => {
    const vault = {
      "record.schema.yaml": RECORD_SCHEMA,
      "a.yml": `${MODELINE("record.schema.yaml")}id: quest.a\n`,
      "b.yml": `${MODELINE("record.schema.yaml")}id: quest.b\n`,
    };
    const files = new MemoryFileSource(vault);
    const index = service(vault, () => DEFAULT_SETTINGS, files);
    await index.rebuild(["a.yml", "b.yml"]);
    expect(files.reads.filter((path) => path === "record.schema.yaml")).toHaveLength(1);
  });

  it("records only the latest indexing of a file that changes while it is read", async () => {
    const vault: Record<string, string> = {
      "record.schema.yaml": RECORD_SCHEMA,
      "a.yml": `${MODELINE("record.schema.yaml")}id: quest.first\n`,
    };
    const release: (() => void)[] = [];
    // The first read of the record waits until the second indexing has completed.
    const files: FileSource = {
      read: async (path) => {
        const text = vault[path] ?? null;
        if (path === "a.yml" && release.length === 0) {
          await new Promise<void>((resolve) => release.push(resolve));
        }
        return text;
      },
    };
    const index = service(vault, () => DEFAULT_SETTINGS, files);
    const first = index.indexFile("a.yml");
    vault["a.yml"] = `${MODELINE("record.schema.yaml")}id: quest.second\n`;
    await index.indexFile("a.yml");
    release[0]?.();
    await first;
    expect(index.identifierOf("a.yml")).toBe("quest.second");
  });

  it("indexes the gnomon fixtures, whose schemas declare `x-identifier: id`", async () => {
    const index = service(
      {},
      () => ({ ...DEFAULT_SETTINGS, pathRules: FIXTURE_RULES }),
      new DirectoryFileSource(FIXTURES_ROOT),
    );
    await index.rebuild([
      "gnomon/question.yml",
      "gnomon/target-system.yml",
      "geonexus/glossary.yml",
    ]);

    expect(index.resolve("quest.pendulum.sustained-oscillation")).toEqual({
      status: "found",
      path: "gnomon/question.yml",
    });
    expect(index.resolve("system.pendulum-driven-damped")).toEqual({
      status: "found",
      path: "gnomon/target-system.yml",
    });
    expect(index.identifierOf("geonexus/glossary.yml")).toBeNull();
  });
});
