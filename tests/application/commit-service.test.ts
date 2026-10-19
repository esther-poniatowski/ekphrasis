import { describe, expect, it } from "vitest";
import {
  CommitService,
  UNCONFIRMED,
  type CommitResult,
  type DocumentEditor,
  type FormReady,
} from "../../src/application";
import {
  buildFormModel,
  REFUSALS,
  type JsonValue,
  type ScalarValue,
  type YamlPath,
} from "../../src/domain";
import { YamlDocumentParser, YamlSourceEditor } from "../../src/infrastructure";
import { schemaSet } from "../support/schemas";
import { createValidation } from "../support/validation";

const parser = new YamlDocumentParser();
const commits = new CommitService(parser, new YamlSourceEditor(), createValidation());

const SCHEMA: JsonValue = {
  type: "object",
  required: ["title", "status"],
  "x-unfilled": ["open"],
  properties: {
    title: { type: "string" },
    status: { enum: ["posed", "open"] },
    note: { type: "string", "x-kind": "markdown" },
    formula: { type: "string", "x-kind": "latex" },
    count: { type: "integer" },
    done: { type: "boolean" },
    subject: {
      type: "object",
      properties: {
        system: { type: "string" },
        contrast: { type: "object", properties: { locus: { type: "string" } } },
      },
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, symbol: { type: "string" } },
      },
    },
    check: { type: "object", properties: { verdict: { type: "string" } } },
  },
};

function state(text: string, schema: JsonValue = SCHEMA): FormReady {
  const schemas = schemaSet({ "s.json": schema });
  const tree = parser.parse(text);
  const model = buildFormModel(schemas, tree, text);
  return {
    status: "form",
    binding: { schemaPath: "s.json", source: "modeline", reference: "s.json" },
    model,
    report: createValidation().validate(schemas, model, tree),
    schemas,
    schemaPaths: schemas.paths,
  };
}

function commit(
  text: string,
  path: YamlPath,
  value: ScalarValue,
  schema?: JsonValue,
): CommitResult {
  return commits.commit(state(text, schema), text, { path, value });
}

/** New text of a commit that must be written. */
function written(text: string, path: YamlPath, value: ScalarValue, schema?: JsonValue): string {
  const result = commit(text, path, value, schema);
  if (result.status !== "written")
    throw new Error(`Expected a written commit, got ${JSON.stringify(result)}.`);
  return result.text;
}

describe("commit of a present value", () => {
  it("rewrites the token only, keeping the comment of its line", () => {
    expect(written("title: old # c\nstatus: posed\n", ["title"], "new")).toBe(
      "title: new # c\nstatus: posed\n",
    );
  });

  it("keeps the quotes of a quoted value", () => {
    expect(written('title: "old"\nstatus: posed\n', ["title"], "new")).toBe(
      'title: "new"\nstatus: posed\n',
    );
  });

  it("quotes a value holding a reserved construction, or read as another type", () => {
    expect(written("title: old\nstatus: posed\n", ["title"], "a: b")).toBe(
      "title: 'a: b'\nstatus: posed\n",
    );
    expect(written("title: old\nstatus: posed\n", ["title"], "42")).toBe(
      "title: '42'\nstatus: posed\n",
    );
  });

  it("writes a number and a boolean plain", () => {
    expect(written("title: a\nstatus: posed\ncount: 1\n", ["count"], 42)).toBe(
      "title: a\nstatus: posed\ncount: 42\n",
    );
    expect(written("title: a\nstatus: posed\ndone: false\n", ["done"], true)).toBe(
      "title: a\nstatus: posed\ndone: true\n",
    );
  });

  it("keeps a plain formula plain, and writes a new formula single-quoted", () => {
    expect(written("title: a\nstatus: posed\nformula: x\n", ["formula"], "\\gamma")).toBe(
      "title: a\nstatus: posed\nformula: \\gamma\n",
    );
    expect(written("title: a\nstatus: posed\n", ["formula"], "\\gamma")).toBe(
      "title: a\nstatus: posed\nformula: '\\gamma'\n",
    );
  });

  it("turns a value into a literal block scalar on a line break, keeping its comment", () => {
    expect(
      written('title: a\nstatus: posed\nnote: "x" # c\nend: 1\n', ["note"], "one\ntwo\n"),
    ).toBe("title: a\nstatus: posed\nnote: | # c\n  one\n  two\nend: 1\n");
  });

  it("writes a single-line kind plain or single-quoted when its value was a block scalar", () => {
    expect(written("title: |-\n  old\nstatus: posed\n", ["title"], "One title")).toBe(
      "title: One title\nstatus: posed\n",
    );
    expect(written("title: >\n  old\nstatus: posed\n", ["title"], "a: b")).toBe(
      "title: 'a: b'\nstatus: posed\n",
    );
    expect(written("title: a\nstatus: posed\nformula: |\n  x\n", ["formula"], "\\gamma")).toBe(
      "title: a\nstatus: posed\nformula: '\\gamma'\n",
    );
  });

  it("keeps a block scalar with its header comment", () => {
    const text = "title: a\nstatus: posed\nnote: |- # h\n  old\n  text\nend: 1\n";
    expect(written(text, ["note"], "new")).toBe(
      "title: a\nstatus: posed\nnote: |- # h\n  new\nend: 1\n",
    );
  });

  it("keeps the trailing blank lines of a block scalar kept by the chomping indicator", () => {
    const text = "title: a\nstatus: posed\nnote: |+\n  old\n\nend: 1\n";
    expect(written(text, ["note"], "new\n\n")).toBe(
      "title: a\nstatus: posed\nnote: |+\n  new\n\nend: 1\n",
    );
  });

  it("edits a value inside a flow mapping in place", () => {
    expect(
      written("title: a\nstatus: posed\ncheck: {verdict: x}\n", ["check", "verdict"], "a, b"),
    ).toBe("title: a\nstatus: posed\ncheck: {verdict: 'a, b'}\n");
  });
});

describe("commit of an empty or absent value", () => {
  it("fills an empty value after its colon, before its comment", () => {
    expect(written("title: a\nstatus: posed\nnote:   # write here\n", ["note"], "text")).toBe(
      "title: a\nstatus: posed\nnote: text   # write here\n",
    );
  });

  it("fills an empty value with a block scalar, keeping the comment on the line of the key", () => {
    expect(
      written("title: a\nstatus: posed\nnote: # write here\nend: 1\n", ["note"], "a\nb\n"),
    ).toBe("title: a\nstatus: posed\nnote: | # write here\n  a\n  b\nend: 1\n");
  });

  it("fills an empty value on a last line without a line break", () => {
    expect(written("title: a\nstatus: posed\nnote:", ["note"], "a\nb")).toBe(
      "title: a\nstatus: posed\nnote: |-\n  a\n  b\n",
    );
  });

  it("inserts an absent key after the preceding key of the schema, with its indentation", () => {
    const text =
      "title: a\nstatus: posed\nsubject:\n    system: s # c\n    # comment\ndone: true\n";
    expect(written(text, ["note"], "text")).toBe(
      "title: a\nstatus: posed\nnote: text\nsubject:\n    system: s # c\n    # comment\ndone: true\n",
    );
    expect(written(text, ["subject", "contrast", "locus"], "x")).toBe(
      "title: a\nstatus: posed\nsubject:\n    system: s # c\n    contrast:\n      locus: x\n    # comment\ndone: true\n",
    );
  });

  it("inserts an absent key before the following key when no preceding key is present", () => {
    const text = "status: posed\nitems:\n  - symbol: s\n";
    expect(written(text, ["items", 0, "name"], "text")).toBe(
      "status: posed\nitems:\n  - name: text\n    symbol: s\n",
    );
  });

  it("inserts an absent key under an empty value, which becomes a mapping", () => {
    expect(
      written(
        "title: a\nstatus: posed\nsubject: # later\ndone: true\n",
        ["subject", "system"],
        "s",
      ),
    ).toBe("title: a\nstatus: posed\nsubject: # later\n  system: s\ndone: true\n");
    expect(written("title: a\nstatus: posed\nsubject: null\n", ["subject", "system"], "s")).toBe(
      "title: a\nstatus: posed\nsubject:\n  system: s\n",
    );
  });

  it("inserts a multi-line value at an absent key as a literal block scalar", () => {
    expect(written("title: a\nstatus: posed\n", ["note"], "a\nb\n")).toBe(
      "title: a\nstatus: posed\nnote: |\n  a\n  b\n",
    );
  });

  it("inserts into a text without a final line break", () => {
    expect(written("title: a\nstatus: posed", ["note"], "text")).toBe(
      "title: a\nstatus: posed\nnote: text\n",
    );
  });
});

describe("commit of a cleared value", () => {
  it("removes the key of a cleared optional field, and keeps its comment", () => {
    expect(written("title: a\nstatus: posed\nnote: x # kept\ndone: true\n", ["note"], null)).toBe(
      "title: a\nstatus: posed\n# kept\ndone: true\n",
    );
    expect(
      written("title: a\nstatus: posed\nnote: |- # h\n  x\ndone: true\n", ["note"], null),
    ).toBe("title: a\nstatus: posed\n# h\ndone: true\n");
  });

  it("removes the first key of a sequence item up to the next key", () => {
    expect(
      written("status: posed\nitems:\n  - name: text\n    symbol: s\n", ["items", 0, "name"], null),
    ).toBe("status: posed\nitems:\n  - symbol: s\n");
  });

  it("keeps the only key of a mapping, with an empty value", () => {
    expect(
      written("title: a\nstatus: posed\nsubject:\n  system: s\n", ["subject", "system"], null),
    ).toBe("title: a\nstatus: posed\nsubject:\n  system:\n");
  });

  it("writes the first unfilled value of the schema at a cleared required field", () => {
    expect(written("title: a\nstatus: posed # c\n", ["status"], null)).toBe(
      "title: a\nstatus: open # c\n",
    );
  });

  it("erases the value of a cleared required field when the schema has no unfilled value", () => {
    const schema = {
      type: "object",
      required: ["a", "b"],
      properties: { a: { type: "string" }, b: { type: "string" } },
    };
    expect(written("a: x # c\nb: |\n  y\nz: 1\n", ["a"], null, schema)).toBe(
      "a:  # c\nb: |\n  y\nz: 1\n",
    );
    expect(written("a: x\nb: |\n  y\nz: 1\n", ["b"], null, schema)).toBe("a: x\nb:\nz: 1\n");
  });
});

describe("refused commits", () => {
  it("refuses a commit that the domain does not plan", () => {
    expect(
      commit(
        "title: a\nstatus: posed\ncheck: {verdict: x, other: 1}\n",
        ["check", "verdict"],
        null,
      ),
    ).toEqual({
      status: "refused",
      reason: REFUSALS.flow,
    });
  });

  it("refuses a new text that does not read back as the expected tree", () => {
    const corrupting: DocumentEditor = { apply: (source) => source.replace("posed", "answered") };
    const service = new CommitService(parser, corrupting, createValidation());
    const text = "title: a\nstatus: posed\n";
    expect(service.commit(state(text), text, { path: ["title"], value: "b" })).toEqual({
      status: "refused",
      reason: UNCONFIRMED,
    });
  });

  it("refuses a new text that fails to parse", () => {
    const breaking: DocumentEditor = { apply: (source) => `${source}[` };
    const service = new CommitService(parser, breaking, createValidation());
    const text = "title: a\nstatus: posed\n";
    expect(service.commit(state(text), text, { path: ["title"], value: "b" })).toEqual({
      status: "refused",
      reason: UNCONFIRMED,
    });
  });

  it("rebuilds the form model from the written text", () => {
    const result = commit("title: a\nstatus: posed\n", ["title"], "b");
    if (result.status !== "written") throw new Error("expected a written commit");
    const root = result.state.model.root;
    expect("children" in root && root.children[0]).toMatchObject({ id: "title", value: "b" });
  });
});
