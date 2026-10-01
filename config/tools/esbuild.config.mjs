// =================================================================================================
// esbuild Configuration for Ekphrasis
//
// Bundles a build target into the `main.js` file that Obsidian loads from a plugin folder.
//
// Usage
// -----
//   node config/tools/esbuild.config.mjs [production] [--target=<name>]
//
//   production       single minified build; without it, watch mode with inline sourcemaps
//   --target=plugin  the ekphrasis plugin, written to `main.js` at the repository root (default)
//
// Notes
// -----
// Modules provided by the Obsidian runtime (obsidian, electron, CodeMirror, Lezer) are marked as
// external and must never be bundled. JSX settings are read from `tsconfig.json`.
// =================================================================================================
import { builtinModules } from "node:module";
import esbuild from "esbuild";

/** Build targets: each one is a plugin folder holding its own `manifest.json`. */
const TARGETS = {
  plugin: { entryPoints: ["src/main.ts"], outfile: "main.js" },
};

const args = process.argv.slice(2);
const production = args.includes("production");
const targetName = args.find((arg) => arg.startsWith("--target="))?.slice("--target=".length);
const target = TARGETS[targetName ?? "plugin"];
if (!target) {
  throw new Error(`Unknown build target "${targetName}"; known: ${Object.keys(TARGETS).join(", ")}.`);
}

const context = await esbuild.context({
  ...target,
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*", ...builtinModules],
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  minify: production,
  treeShaking: true,
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
