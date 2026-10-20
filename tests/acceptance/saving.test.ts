/**
 * Exit criterion of the milestones *Saving of scalars* and *Collections*: the golden test of byte
 * preservation.
 *
 * Every scalar field of every bound fixture receives three commits, each on the original text:
 * an edit that keeps the style of the value, an edit that forces another style, and a clear.
 * Each commit is either written or refused because its value is locked, or because it would
 * remove a comment inside a flow collection. A written commit keeps every comment, and changes
 * no byte outside the lines of its entry; an absent field is written by an insertion, which
 * leaves the old text whole.
 *
 * Every collection of every bound fixture also receives structural commits, each on the original
 * text: each item removed, and moved one position up and down; the next item inserted by the edit
 * of its first scalar; each unchecked admitted value of a field of kind `choices` inserted; each
 * entry of a mapping keyed by identifiers removed, and a new entry inserted; the first item of each
 * absent nested sequence inserted, in each item or entry and in the next one, so that the new
 * collection takes the form of its siblings; each value of kind `alternatives` switched to each
 * other alternative, by the removal of the keys of its alternative only. A written structural
 * commit keeps every comment, and changes no byte outside the lines of the collection; an
 * insertion leaves the old text whole.
 */
import { describe, expect, it } from "vitest";
import { CommitService, DEFAULT_SETTINGS, FormService } from "../../src/application";
import { REFUSALS } from "../../src/domain";
import { FileSchemaLoader, YamlDocumentParser, YamlSourceEditor } from "../../src/infrastructure";
import { DirectoryFileSource, FIXTURE_BINDINGS, FIXTURE_RULES } from "../support/fixture-vault";
import {
  changesOnly,
  checkStructuralCommits,
  collectionSites,
  entryRegion,
  firstDifference,
  inFlow,
  scalarSites,
  structuralCommits,
  variants,
} from "../support/golden-edits";
import { commentsOf } from "../support/yaml-comments";
import { FIXTURES_ROOT, readYamlFiles } from "../support/yaml-files";
import { createValidation } from "../support/validation";

const parser = new YamlDocumentParser();
const forms = new FormService(
  parser,
  new FileSchemaLoader(new DirectoryFileSource(FIXTURES_ROOT)),
  createValidation(),
  () => ({ ...DEFAULT_SETTINGS, pathRules: FIXTURE_RULES }),
);
const commits = new CommitService(parser, new YamlSourceEditor(), createValidation());

const records = readYamlFiles(FIXTURES_ROOT).filter(
  ({ name }) => FIXTURE_BINDINGS[name.split("\\").join("/")] !== undefined,
);

describe("golden test of byte preservation", () => {
  it("binds the construct fixtures holding block scalars and trailing comments", () => {
    expect(records.map(({ name }) => name)).toEqual(
      expect.arrayContaining(["constructs/block-scalars.yml", "constructs/anchors.yml"]),
    );
  });

  describe.each(records)("$name", ({ name, text }) => {
    it("writes every scalar field, changing only the lines of its entry", async () => {
      const state = await forms.open(name, text);
      if (state.status !== "form") throw new Error(`Expected a form, got ${state.status}.`);
      const sites = scalarSites(state.model.root);
      expect(sites.length).toBeGreaterThan(0);
      const comments = commentsOf(text);
      const failures: string[] = [];
      let written = 0;

      for (const [field, parent] of sites) {
        for (const [variant, value] of variants(field)) {
          const label = `${field.id} ${variant}`;
          const result = commits.commit(state, text, { path: field.path, value });
          if (result.status === "refused") {
            const expected =
              field.lock !== null
                ? REFUSALS.locked
                : value === null && inFlow(parent)
                  ? REFUSALS.comment
                  : null;
            if (result.reason !== expected) failures.push(`${label}: refused, ${result.reason}`);
            continue;
          }
          if (result.status === "unchanged") continue;
          written += 1;
          const after = result.text;
          if (JSON.stringify(commentsOf(after)) !== JSON.stringify(comments)) {
            failures.push(`${label}: comments changed`);
          }
          if (field.node === null) {
            const at = firstDifference(text, after);
            if (!changesOnly(text, after, at, at)) failures.push(`${label}: not an insertion`);
            continue;
          }
          const [allowedStart, allowedEnd] = entryRegion(text, field, parent);
          if (!changesOnly(text, after, allowedStart, allowedEnd)) {
            failures.push(`${label}: changed bytes outside its entry`);
          }
        }
      }

      expect(failures, failures.join("\n")).toEqual([]);
      expect(written).toBeGreaterThan(sites.length);
    });
  });
});

describe("golden test of byte preservation after structural edits", () => {
  describe.each(records)("$name", ({ name, text }) => {
    it("changes the entries of every collection, only within the lines of the collection", async () => {
      const state = await forms.open(name, text);
      if (state.status !== "form") throw new Error(`Expected a form, got ${state.status}.`);
      const { failures, written, switches } = checkStructuralCommits(commits, state, text);
      expect(failures, failures.join("\n")).toEqual([]);
      const sites = collectionSites(state.model.root).map(([field]) => field);
      if (sites.some((field) => structuralCommits(field).length > 0)) {
        expect(written).toBeGreaterThan(0);
      }
      if (sites.some((field) => field.kind === "alternatives" && field.node !== null)) {
        expect(switches).toBeGreaterThan(0);
      }
    });
  });
});
