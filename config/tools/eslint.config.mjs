// =================================================================================================
// ESLint Configuration for Ekphrasis (flat config)
//
// Sections
// --------
// - Type-aware TypeScript rules
// - Architectural boundaries: enforces the inward dependency rule between layers
//     domain         -> (nothing internal, no Obsidian, no third-party I/O)
//     application    -> domain
//     infrastructure -> domain, application
//     adapters       -> all layers (composition root, Obsidian integration, Preact components)
//   The host libraries `obsidian` and `preact` are admitted in the adapters layer only.
// =================================================================================================
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

const rootDir = fileURLToPath(new URL("../..", import.meta.url));

/**
 * Libraries bound to the host interface, forbidden in every layer except the adapters. Each
 * pattern follows the gitignore syntax, so `preact` also matches `preact/hooks`.
 */
const HOST_LIBRARIES = ["obsidian", "preact"];

/** Globs of the source files of one layer, TypeScript and TSX alike. */
const layer = (name) => [`src/${name}/**/*.ts`, `src/${name}/**/*.tsx`];

/** Builds a `no-restricted-imports` rule forbidding the given module patterns. */
const forbid = (...groups) => ({
  "no-restricted-imports": [
    "error",
    { patterns: groups.map((group) => ({ group: [group], message: "Violates layer boundaries." })) },
  ],
});

export default tseslint.config(
  { ignores: ["main.js", "node_modules/", "coverage/", "examples/"] },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { project: "./tsconfig.json", tsconfigRootDir: rootDir },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
    },
  },
  // --- Architectural Boundaries ------------------------------------------------------------------
  {
    files: layer("domain"),
    rules: forbid(
      ...HOST_LIBRARIES,
      "yaml",
      "**/application/**",
      "**/infrastructure/**",
      "**/adapters/**",
    ),
  },
  {
    files: layer("application"),
    rules: forbid(...HOST_LIBRARIES, "yaml", "**/infrastructure/**", "**/adapters/**"),
  },
  {
    files: layer("infrastructure"),
    rules: forbid(...HOST_LIBRARIES, "**/adapters/**"),
  },
);
