/**
 * Guards the link checker `scripts/check-links.mjs`: run on a folder of planted notes, it reports
 * each kind of broken link once, and none of the valid or ignored links.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const root = mkdtempSync(join(tmpdir(), "ekphrasis-links-"));

afterAll(() => rmSync(root, { recursive: true, force: true }));

function write(path: string, text: string): void {
  mkdirSync(join(root, path, ".."), { recursive: true });
  writeFileSync(join(root, path), text);
}

write(
  "docs/target.md",
  '---\nindex: "[Docs](docs/_index.md)"\n---\n# Target note\n\n## Second section\n\nA block. ^block-a\n',
);
write("docs/_index.md", "# Docs\n");
write(
  "docs/source.md",
  [
    "---",
    'index: "[Docs](docs/_index.md)"',
    "---",
    "Valid: [file](target.md), [heading](target.md#second-section), [block](target.md#^block-a).",
    "Valid: [own block](#^own), [web](https://example.org/missing.md), [uri](obsidian://open?file=x).",
    "Ignored: `[code](missing.md)`.",
    "```",
    "[fenced](missing.md)",
    "```",
    "Broken: [file](missing.md).",
    "Broken: [block](target.md#^block-b).",
    "Broken: [heading](target.md#third-section).",
    "A block of its own. ^own",
    "",
  ].join("\n"),
);
write("docs/front.md", '---\nindex: "[Docs](docs/absent.md)"\n---\n# Front\n');
write("tests/manual/scenarios/vault-note.md", "[record](guidance.yml)\n");

describe("link checker", () => {
  const run = spawnSync("node", ["scripts/check-links.mjs", root], { encoding: "utf8" });
  const reported = run.stdout.split("\n").filter((line) => line.includes(": "));

  it("reports each kind of broken link with its file and line", () => {
    expect(reported).toEqual([
      "docs/front.md:2: docs/absent.md: no such file",
      "docs/source.md:10: missing.md: no such file",
      "docs/source.md:11: target.md#^block-b: no block ^block-b in the file",
      "docs/source.md:12: target.md#third-section: no heading third-section in the file",
    ]);
  });

  it("fails when a link is broken", () => {
    expect(run.status).toBe(1);
  });
});
