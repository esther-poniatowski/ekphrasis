import { describe, expect, it } from "vitest";
import {
  CommitService,
  DEFAULT_SETTINGS,
  FormService,
  InstanceSession,
  type SessionHost,
} from "../../src/application";
import { REFUSALS, type Field } from "../../src/domain";
import { FileSchemaLoader, YamlDocumentParser, YamlSourceEditor } from "../../src/infrastructure";
import { MemoryFileSource } from "../support/fixture-vault";
import { fieldAt } from "../support/form-fields";

const SCHEMA = [
  "type: object",
  "properties:",
  "  title: { type: string }",
  "  status: { type: string }",
  "  check:",
  "    type: object",
  "    properties: { verdict: { type: string }, other: { type: string } }",
].join("\n");

/** Host recording the texts written and the number of displays. */
class RecordingHost implements SessionHost {
  readonly writes: string[] = [];
  displays = 0;

  write(text: string): void {
    this.writes.push(text);
  }

  changed(): void {
    this.displays += 1;
  }
}

function session(): { session: InstanceSession; host: RecordingHost } {
  const parser = new YamlDocumentParser();
  const forms = new FormService(
    parser,
    new FileSchemaLoader(new MemoryFileSource({ "s.yaml": SCHEMA })),
    () => ({ ...DEFAULT_SETTINGS, pathRules: [{ pattern: "*.yml", schema: "s.yaml" }] }),
  );
  const host = new RecordingHost();
  const instance = new InstanceSession(
    forms,
    new CommitService(parser, new YamlSourceEditor()),
    host,
  );
  return { session: instance, host };
}

/** Field `id` of the latest form of `instance`. */
function field(instance: InstanceSession, id: string): Field {
  const form = instance.snapshot.form;
  if (form === null) throw new Error("expected a form");
  return fieldAt(form.model.root, id);
}

describe("instance session", () => {
  it("writes a commit on a loaded form, and rebuilds the form from the new text", async () => {
    const { session: instance, host } = session();
    instance.setText("title: a # c\n");
    await instance.refresh("r.yml");

    expect(instance.commit({ path: ["title"], value: "b" })).toBe("written");
    expect(host.writes).toEqual(["title: b # c\n"]);
    expect(instance.text).toBe("title: b # c\n");
    expect(field(instance, "title")).toMatchObject({ value: "b" });
  });

  it("queues a commit while a text from outside loads, then applies it to that text", async () => {
    const { session: instance, host } = session();
    instance.setText("title: a\nstatus: x\n");
    await instance.refresh("r.yml");

    instance.setText("title: a\nstatus: changed outside\n");
    expect(instance.commit({ path: ["title"], value: "typed" })).toBe("queued");
    expect(host.writes).toEqual([]);
    await instance.refresh("r.yml");

    expect(host.writes).toEqual(["title: typed\nstatus: changed outside\n"]);
  });

  it("keeps the latest form and queues commits while the text fails to parse", async () => {
    const { session: instance, host } = session();
    instance.setText("title: a\nstatus: x\n");
    await instance.refresh("r.yml");

    instance.setText("title: a\nstatus: [x\n");
    await instance.refresh("r.yml");
    expect(instance.snapshot.state?.status).toBe("parse-error");
    expect(field(instance, "title")).toMatchObject({ value: "a" });
    expect(instance.commit({ path: ["title"], value: "typed" })).toBe("queued");

    instance.setText("title: a\nstatus: [x]\n");
    await instance.refresh("r.yml");
    expect(host.writes).toEqual(["title: typed\nstatus: [x]\n"]);
  });

  it("discards the pipeline run of a text replaced meanwhile", async () => {
    const { session: instance } = session();
    instance.setText("title: first\n");
    const first = instance.refresh("r.yml");
    instance.setText("title: second\n");
    const second = instance.refresh("r.yml");
    await Promise.all([first, second]);

    expect(field(instance, "title")).toMatchObject({ value: "second" });
  });

  it("runs the pipeline again when a commit changes the text during a run", async () => {
    const { session: instance } = session();
    instance.setText("title: a\n");
    await instance.refresh("r.yml");

    const run = instance.refresh("r.yml");
    expect(instance.commit({ path: ["title"], value: "b" })).toBe("written");
    await run;

    expect(instance.snapshot.state?.status).toBe("form");
    expect(field(instance, "title")).toMatchObject({ value: "b" });
  });

  it("records the reason of a refused commit at its field, until a commit there succeeds", async () => {
    const { session: instance } = session();
    instance.setText("check: {verdict: x, other: y}\n");
    await instance.refresh("r.yml");

    expect(instance.commit({ path: ["check", "verdict"], value: null })).toBe("refused");
    expect(instance.snapshot.errors.get("check.verdict")).toBe(REFUSALS.flow);

    expect(instance.commit({ path: ["check", "verdict"], value: "z" })).toBe("written");
    expect(instance.snapshot.errors.size).toBe(0);
  });

  it("forgets the errors when a text from outside replaces the current text", async () => {
    const { session: instance } = session();
    instance.setText("check: {verdict: x, other: y}\n");
    await instance.refresh("r.yml");
    instance.commit({ path: ["check", "verdict"], value: null });

    instance.setText("check: {verdict: x}\n");
    expect(instance.snapshot.errors.size).toBe(0);
  });
});
