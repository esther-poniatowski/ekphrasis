// =================================================================================================
// Version Bump Script for Ekphrasis
//
// Invoked by `npm version <patch|minor|major>` (see the `version` script in `package.json`).
// Propagates the new package version to `manifest.json` and records the minimum Obsidian version
// compatible with this release in `versions.json`, as required by the Obsidian plugin registry.
// =================================================================================================
import { readFileSync, writeFileSync } from "node:fs";

const version = process.env.npm_package_version;
if (!version) {
  throw new Error("npm_package_version is undefined: run this script through `npm version`.");
}

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
manifest.version = version;
writeFileSync("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);

const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[version] = manifest.minAppVersion;
writeFileSync("versions.json", `${JSON.stringify(versions, null, 2)}\n`);
