// =================================================================================================
// Test Vault Script for Ekphrasis
//
// Invoked by `npm run test-vault`. Builds the Obsidian vault of the manual test protocols in
// `examples/test-vault/`, from versioned sources only, and resets it before each protocol run.
//
// Contents
// --------
// - Records: copies of `tests/fixtures/` and `tests/manual/scenarios/`, replaced at each run, since
//   the protocols edit them.
// - Protocols: a symbolic link to `tests/manual/protocols/`, so that the ticks and observations
//   written during a run land in the versioned files.
// - Plugin: symbolic links to the bundle, the manifest and the style sheet of the repository, and
//   the settings of `tests/manual/vault-settings.json`, copied over the previous ones.
// - Spikes: while the disposable folder `spikes/` exists, a symbolic link to it as the plugin
//   `ekphrasis-spikes`, left disabled, since its view takes the YAML extensions from ekphrasis.
//
// Every other file of `.obsidian/` (workspace, other plugins such as YAML Editor) is kept.
// =================================================================================================
import { cpSync, existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const VAULT = "examples/test-vault";
const RECORDS = {
  constructs: "tests/fixtures/constructs",
  geonexus: "tests/fixtures/geonexus",
  gnomon: "tests/fixtures/gnomon",
  scenarios: "tests/manual/scenarios",
};
const PROTOCOLS = "tests/manual/protocols";
const SETTINGS = "tests/manual/vault-settings.json";
const PLUGIN_FILES = ["main.js", "manifest.json", "styles.css"];

/** Replaces `link` by a relative symbolic link to `target`, both given from the repository root. */
function link(target, linkPath) {
  rmSync(linkPath, { recursive: true, force: true });
  symlinkSync(relative(join(linkPath, ".."), target), linkPath);
}

mkdirSync(VAULT, { recursive: true });

for (const [folder, source] of Object.entries(RECORDS)) {
  const destination = join(VAULT, folder);
  rmSync(destination, { recursive: true, force: true });
  cpSync(source, destination, { recursive: true });
}

link(PROTOCOLS, join(VAULT, "protocols"));

const pluginFolder = join(VAULT, ".obsidian", "plugins", "ekphrasis");
mkdirSync(pluginFolder, { recursive: true });
for (const file of PLUGIN_FILES) link(file, join(pluginFolder, file));
cpSync(SETTINGS, join(pluginFolder, "data.json"));

// Obsidian lists a plugin only when its folder is a real folder, so the spike plugin, like
// ekphrasis, is a real folder holding links to the built files.
const SPIKES = "spikes";
if (existsSync(join(SPIKES, "manifest.json"))) {
  const spikeFolder = join(VAULT, ".obsidian", "plugins", "ekphrasis-spikes");
  rmSync(spikeFolder, { recursive: true, force: true });
  mkdirSync(spikeFolder, { recursive: true });
  for (const file of ["main.js", "manifest.json"])
    link(join(SPIKES, file), join(spikeFolder, file));
}

const enabledPlugins = join(VAULT, ".obsidian", "community-plugins.json");
if (!existsSync(enabledPlugins))
  writeFileSync(enabledPlugins, `${JSON.stringify(["ekphrasis"])}\n`);

if (!existsSync("main.js"))
  console.warn("main.js is absent: run `npm run build` before opening the vault.");
console.log(`Test vault ready in ${VAULT}; protocols in ${PROTOCOLS}.`);
