// =================================================================================================
// Vitest Configuration for @ekphrasis/configuration
//
// The tests run in plain Node, against the sources. The conformance tests read the vectors of the
// profile from `specs/vectors/` at the root of the repository.
// =================================================================================================
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: fileURLToPath(new URL("../..", import.meta.url)),
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
