/**
 * External configuration of the Gnomon checker for the optional corpus tests: the variable naming
 * the interpreter of the environment where Gnomon is installed, the registry of the Gnomon
 * checkout, and the registration that a researcher enters in the settings. The runtime source of
 * ekphrasis holds none of these values.
 */
import type { CustomCheckerRegistration } from "../../src/application";

/** Environment variable naming the interpreter of the environment where Gnomon is installed. */
export const CHECKER_PYTHON_VARIABLE = "EKPHRASIS_CHECKER_PYTHON";

/** Registry of the Gnomon checkout, from its root. */
export const GNOMON_REGISTRY = "specs/schema-registry.yml";

/** The configuration of the Gnomon checker, as a user enters it in the settings. */
export const GNOMON_CHECKER: CustomCheckerRegistration = {
  name: "gnomon",
  module: "ekphrasis_findings",
  function: "findings_log",
  schemas: ["gnomon:*"],
  arguments: {
    command: [
      "-m",
      "gnomon",
      "check",
      "{folder}",
      "--scope",
      "question-typed",
      "--format",
      "sarif",
    ],
    root: "{folder}",
    context_property: "gnomon/validationScope",
  },
};
