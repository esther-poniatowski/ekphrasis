/**
 * Exit criterion of the milestone *Collections*: the keyed records of a geonexus glossary and the
 * record tables of a gnomon target system can be filled from the form.
 *
 * Each scenario runs the commits that the controls of the form make, one at a time, through the
 * session of the instance, so each commit applies to the form rebuilt from the previous one. A
 * new entry or row is written by the first edit of a value inside it, then filled, reordered and
 * removed. At the end, the filled records raise no issue, and every line of the original text
 * outside the edited collections is still present.
 */
import { describe, expect, it } from "vitest";
import {
  CommitService,
  DEFAULT_SETTINGS,
  FormService,
  InstanceSession,
  type FormReady,
} from "../../src/application";
import { printFieldPath, type Commit } from "../../src/domain";
import { FileSchemaLoader, YamlDocumentParser, YamlSourceEditor } from "../../src/infrastructure";
import { DirectoryFileSource, FIXTURE_RULES } from "../support/fixture-vault";
import { fieldAt } from "../support/form-fields";
import { createValidation } from "../support/validation";
import { FIXTURES_ROOT, readYamlFiles } from "../support/yaml-files";

const parser = new YamlDocumentParser();

/** Session of the fixture `name`, opened as the instance view opens it. */
async function open(name: string): Promise<{ session: InstanceSession; original: string }> {
  const forms = new FormService(
    parser,
    new FileSchemaLoader(new DirectoryFileSource(FIXTURES_ROOT)),
    createValidation(),
    () => ({ ...DEFAULT_SETTINGS, pathRules: FIXTURE_RULES }),
  );
  const commits = new CommitService(parser, new YamlSourceEditor(), createValidation());
  const session = new InstanceSession(forms, commits, { write: () => {}, changed: () => {} });
  const original = readYamlFiles(FIXTURES_ROOT).find((file) => file.name === name)?.text ?? "";
  session.setText(original);
  await session.refresh(name);
  return { session, original };
}

/** Runs `commits` in their order, and fails at the first one that is not written. */
function fill(session: InstanceSession, commits: readonly Commit[]): void {
  for (const commit of commits) {
    const outcome = session.commit(commit);
    const reason = session.snapshot.errors.get(printFieldPath(commit.path));
    expect(outcome, `${JSON.stringify(commit)}: ${reason ?? ""}`).toBe("written");
  }
}

function form(session: InstanceSession): FormReady {
  const form = session.snapshot.form;
  if (form === null) throw new Error("Expected a form.");
  return form;
}

/** Issues of the form of `session` at `path` or below it. */
function issuesWithin(session: InstanceSession, prefix: string): string[] {
  return form(session)
    .report.issues.filter(
      (item) =>
        item.id === prefix || item.id.startsWith(`${prefix}.`) || item.id.startsWith(`${prefix}[`),
    )
    .map((item) => `${item.id}: ${item.message}`);
}

/** Lines of `original` absent from `text`, outside the lines matching `edited`. */
function lostLines(original: string, text: string, edited: RegExp): string[] {
  const kept = new Set(text.split("\n"));
  return original.split("\n").filter((line) => !kept.has(line) && !edited.test(line));
}

describe("keyed records of a geonexus glossary", () => {
  it("fills a new term, its frames and its confusions, then removes a term", async () => {
    const { session, original } = await open("geonexus/glossary.yml");
    const term = ["terms", "phase-lag"];
    fill(session, [
      { path: [...term, "label"], value: "phase lag" },
      { path: [...term, "gloss"], value: "the delay of the response behind the forcing" },
      { path: [...term, "category"], value: "noun" },
      { path: [...term, "frames", 0], value: "~ of {system}" },
      { path: [...term, "frames", 1], value: "~ at resonance" },
      { kind: "move-item", path: [...term, "frames", 1], to: 0 },
      { path: [...term, "confusions", 0, "term"], value: "damping-ratio" },
      {
        path: [...term, "confusions", 0, "distinction"],
        value: "the lag is an angle whereas the ratio is a number",
      },
      { kind: "remove-entry", path: ["terms", "natural-frequency"] },
    ]);
    const text = session.text;
    expect(text).toContain(
      [
        "  phase-lag:",
        "    label: phase lag",
        "    gloss: the delay of the response behind the forcing",
        "    category: noun",
        "    frames:",
        "      - ~ at resonance",
        "      - ~ of {system}",
        "    confusions:",
        "      - term: damping-ratio",
        "        distinction: the lag is an angle whereas the ratio is a number",
      ].join("\n"),
    );
    // The new term sorts after `natural-frequency`, whose removal keeps the comment of its lines.
    expect(text.indexOf("  damping-ratio:")).toBeLessThan(text.indexOf("  phase-lag:"));
    expect(text).not.toContain("natural-frequency:");
    expect(text).toContain("  # noun | verb | adjective\n  phase-lag:\n");
    expect(issuesWithin(session, "terms.phase-lag")).toEqual([]);
    expect(
      lostLines(original, text, /natural-frequency|PREFERRED|ONE-SENTENCE|CATEGORY|frames: \[\]/),
    ).toEqual([]);
    expect(fieldAt(form(session).model.root, "terms.phase-lag.frames[1]")).toMatchObject({
      value: "~ of {system}",
    });
  });

  it("adds a replacement row to a forbidden term", async () => {
    const { session } = await open("geonexus/glossary.yml");
    const rows = ["forbidden", "swing-rate", "replace_with"];
    fill(session, [
      { path: [...rows, 1, "term"], value: "damping-ratio" },
      { path: [...rows, 1, "when"], value: "the phrase names the decay" },
    ]);
    expect(session.text).toContain(
      "      - term: damping-ratio\n        when: the phrase names the decay\n",
    );
  });
});

describe("record tables of a gnomon target system", () => {
  it("fills a new variable row, reorders and removes rows, and fills a law", async () => {
    const { session, original } = await open("gnomon/target-system.yml");
    fill(session, [
      { path: ["variables", 2, "name"], value: "forcing amplitude" },
      { path: ["variables", 2, "symbol"], value: "F" },
      { path: ["variables", 2, "determined"], value: "outside" },
      { path: ["variables", 2, "signature", 0], value: "t" },
      { path: ["variables", 2, "expression"], value: "F = F_0" },
      { path: ["variables", 2, "shared"], value: true },
      { kind: "move-item", path: ["variables", 2], to: 0 },
      { kind: "remove-item", path: ["constituents", 1] },
      { path: ["laws", 0, "holds"], value: "for small damping" },
      { path: ["index_sets", 1, "name"], value: "bob" },
      { path: ["index_sets", 1, "structure"], value: "discrete" },
      { path: ["reference_class", "selection_criteria", 0], value: "a periodic torque" },
    ]);
    const text = session.text;
    expect(text).toContain(
      [
        "variables:",
        "  - name: forcing amplitude",
        "    symbol: F",
        "    determined: outside",
        "    signature:",
        "      - t",
        "    expression: F = F_0",
        "    shared: true",
        '  - name: "angle from the vertical"',
      ].join("\n"),
    );
    expect(text).toContain("  selection_criteria: [a periodic torque]\n");
    expect(text).toContain("    holds: for small damping\n");
    expect(text).toContain('  - name: "bob"\n    symbol: bob\n    extent: "single"\n\nindex_sets:');
    expect(text).toContain("  - name: bob\n    structure: discrete\n");
    expect(issuesWithin(session, "variables")).toEqual([]);
    expect(lostLines(original, text, /"rod"|symbol: rod|holds: open|selection_criteria/)).toEqual(
      [],
    );
  });
});
