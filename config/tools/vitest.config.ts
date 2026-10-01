// =================================================================================================
// Vitest Configuration for Ekphrasis
//
// Tests target the Obsidian-independent layers (domain, application, infrastructure), which run in
// plain Node. The `obsidian` module is not resolvable outside the host application; adapter tests,
// if introduced, require a dedicated mock registered through `resolve.alias`. Preact components
// need a simulated DOM, selected per test file with a `@vitest-environment` comment.
//
// JSX settings are read from `tsconfig.json`.
// =================================================================================================
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: fileURLToPath(new URL("../..", import.meta.url)),
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/adapters/**", "src/main.ts"],
    },
  },
});
