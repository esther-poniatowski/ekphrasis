// =================================================================================================
// ESLint Configuration for @ekphrasis/configuration (flat config)
//
// Sections
// --------
// - Type-aware TypeScript rules.
// - Boundaries: the modules of `src/` import neither a host library nor Node, so that the package
//   runs in Obsidian on mobile; only the tests, the scripts and the tool configurations import Node.
// =================================================================================================
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

const rootDir = fileURLToPath(new URL("../..", import.meta.url));

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "src/generated/"] },
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
  {
    files: ["src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["node:*", "obsidian", "fs", "path"], message: "The package runs on mobile." },
          ],
        },
      ],
    },
  },
);
