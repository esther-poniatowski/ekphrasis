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
// Modules provided by the Obsidian runtime are marked as external and must never be bundled: a
// second copy of a CodeMirror core package would break the identity checks of its extensions.
// The list is explicit rather than a wildcard over `@codemirror/*` and `@lezer/*`, because the
// YAML language mode (`@codemirror/lang-yaml`, `@lezer/yaml`) is absent from the runtime and must
// be bundled. JSX settings are read from `tsconfig.json`.
// =================================================================================================
import { builtinModules } from "node:module";
import esbuild from "esbuild";

/** Packages that Obsidian supplies at run time. */
const RUNTIME_PACKAGES = [
  "obsidian",
  "electron",
  "@codemirror/autocomplete",
  "@codemirror/collab",
  "@codemirror/commands",
  "@codemirror/language",
  "@codemirror/lint",
  "@codemirror/search",
  "@codemirror/state",
  "@codemirror/view",
  "@lezer/common",
  "@lezer/highlight",
  "@lezer/lr",
];

/** Node built-ins in both admitted import forms (`child_process` and `node:child_process`). */
const NODE_BUILTINS = [...builtinModules, ...builtinModules.map((name) => `node:${name}`)];

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
  external: [...RUNTIME_PACKAGES, ...NODE_BUILTINS],
  format: "cjs",
  target: "es2020",
  // Electron exposes Node built-ins through CommonJS. Lower dynamic imports so the lazy desktop
  // paths call `require` only when used; leaving them as `import("node:…")` asks the renderer to
  // fetch a node: URL and fails. Their laziness keeps the same bundle loadable on mobile.
  supported: { "dynamic-import": false },
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
