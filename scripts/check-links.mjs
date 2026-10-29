// Checks the links of the Markdown files of the repository: each relative link must reach a file,
// and each anchor must reach a heading or a block of that file.
//
// Usage: node scripts/check-links.mjs [root]
//
// - Links in the body of a note resolve from its folder. Links in its frontmatter, such as the key
//   `index`, resolve from the root of the repository, as the notes write them.
// - A link with a scheme (`https:`, `obsidian:`, …) is not checked, and neither is a link inside a
//   code block or an inline code span.
// - The folder `tests/manual/scenarios/` is skipped: its notes are vault content, whose links reach
//   the records of the test vault.
// - Exits with status 1 when a link is broken, after listing every broken link.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const SKIPPED = ["node_modules", ".git", "examples/test-vault", "tests/manual/scenarios"];
const LINK = /!?\[(?:[^\]\\]|\\.|\[[^\]]*\])*\]\(([^)\s]+|<[^>]+>)\)/g;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

const root = resolve(process.argv[2] ?? ".");
const broken = [];
for (const file of markdownFiles(root)) checkFile(file);
for (const { file, line, target, reason } of broken) {
  console.log(`${relative(root, file)}:${line}: ${target}: ${reason}`);
}
console.log(`Links checked; ${broken.length} broken.`);
process.exit(broken.length === 0 ? 0 : 1);

function markdownFiles(folder) {
  const files = [];
  for (const name of readdirSync(folder).sort()) {
    const path = join(folder, name);
    if (SKIPPED.some((skipped) => relative(root, path) === skipped)) continue;
    if (statSync(path).isDirectory()) files.push(...markdownFiles(path));
    else if (name.endsWith(".md")) files.push(path);
  }
  return files;
}

function checkFile(file) {
  const lines = readFileSync(file, "utf8").split("\n");
  let fence = false;
  let frontmatter = lines[0] === "---";
  lines.forEach((text, index) => {
    if (frontmatter && index > 0 && text === "---") {
      frontmatter = false;
      return;
    }
    if (/^\s*(```|~~~)/.test(text)) {
      fence = !fence;
      return;
    }
    if (fence) return;
    const base = frontmatter ? root : dirname(file);
    for (const match of text.replace(/`[^`]*`/g, "").matchAll(LINK)) {
      const target = match[1].replace(/^<|>$/g, "");
      const reason = defectOf(base, file, target);
      if (reason !== null) broken.push({ file, line: index + 1, target, reason });
    }
  });
}

/** Reason why `target`, written in `file` and resolved from `base`, is broken, or `null`. */
function defectOf(base, file, target) {
  if (SCHEME.test(target)) return null;
  const hash = target.indexOf("#");
  const path = decoded(hash < 0 ? target : target.slice(0, hash));
  const anchor = hash < 0 ? "" : decoded(target.slice(hash + 1));
  const reached = path === "" ? file : resolve(base, path);
  if (!existsSync(reached)) return "no such file";
  if (anchor === "" || statSync(reached).isDirectory()) return null;
  const text = readFileSync(reached, "utf8");
  if (anchor.startsWith("^")) {
    return new RegExp(`(^|\\s)\\^${escaped(anchor.slice(1))}\\s*$`, "m").test(text)
      ? null
      : `no block ${anchor} in the file`;
  }
  const headings = [...text.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map(([, heading]) => heading);
  return headings.some((heading) => heading === anchor || slug(heading) === slug(anchor))
    ? null
    : `no heading ${anchor} in the file`;
}

/** Anchor of a heading, as GitHub writes it. */
function slug(heading) {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

function decoded(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

function escaped(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
