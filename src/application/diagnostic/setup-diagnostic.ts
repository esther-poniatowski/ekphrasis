/**
 * Use case of the setup diagnostic: checks, in the order of the route, the schema registry and the
 * schemas of the forms, the opened record and its saving, then the configured custom checkers.
 *
 * The diagnostic only reads: it changes no file, no setting and no environment. It runs the
 * configured checker command once on the opened record, as one validation would.
 */
import { readSchemaField, resolveVaultPath } from "../../domain";
import type { DocumentParser, FileSource, SchemaLoader, SchemaValidator } from "../protocols";
import type { RegistryReader } from "../registry-reader";
import type { EkphrasisSettings } from "../settings";
import { checkerChecks } from "./checker-checks";
import type { PythonProbe, VaultInspector } from "./ports";
import { recordChecks, type OpenedRecord } from "./record-checks";
import { notPassed, type DiagnosticCheck, type DiagnosticReport } from "./report";
import { schemaChecks, type SchemaFacts } from "./schema-checks";

export interface SetupDiagnosticDependencies {
  readonly settings: EkphrasisSettings;
  /** Whether the host is the desktop app, the only one that runs Python checkers. */
  readonly desktop: boolean;
  readonly record: OpenedRecord | null;
  readonly registry: RegistryReader;
  readonly files: FileSource;
  readonly parser: DocumentParser;
  readonly loader: SchemaLoader;
  readonly validator: SchemaValidator;
  readonly vault: VaultInspector;
  /** Probe of the configured interpreter; `null` where Python cannot run. */
  readonly probe: PythonProbe | null;
  /** Time at which the plugin loaded, in milliseconds. */
  readonly loadedAt: number;
  /** Absolute path of a vault file, as the checkers receive it. */
  readonly resolveFile: (vaultPath: string) => string;
  /** Current time, in milliseconds. */
  readonly now: () => number;
}

export async function runSetupDiagnostic(
  dependencies: SetupDiagnosticDependencies,
): Promise<DiagnosticReport> {
  const started = dependencies.now();
  const { settings, record } = dependencies;
  const checks: DiagnosticCheck[] = [];
  let facts: SchemaFacts = {
    registry: { status: "unconfigured" },
    identifiers: [],
    generatedPaths: new Set(),
  };
  await guarded(checks, { id: "schemas", name: "the schemas" }, async () => {
    const schemas = await schemaChecks({
      ...dependencies,
      recordDeclaresSchema: record !== null && readSchemaField(record.text) !== null,
    });
    facts = schemas.facts;
    return schemas.checks;
  });
  const resourceRoot = resolveVaultPath("", settings.schemaResourceRoot.trim());
  await guarded(checks, { id: "record", name: "the opened record" }, () =>
    recordChecks(record, facts, dependencies.vault, resourceRoot),
  );
  await guarded(checks, { id: "checkers", name: "the custom checkers" }, () =>
    checkerChecks({ ...dependencies, facts }),
  );
  return { checks, durationMs: dependencies.now() - started };
}

/**
 * Appends the checks of one family; an unexpected error of the family becomes a failed check,
 * so that the checks of the other families still reach the researcher.
 */
async function guarded(
  checks: DiagnosticCheck[],
  family: { readonly id: string; readonly name: string },
  run: () => Promise<readonly DiagnosticCheck[]>,
): Promise<void> {
  try {
    checks.push(...(await run()));
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    checks.push(
      notPassed(
        "fail",
        {
          id: `diagnostic.${family.id}`,
          consequence: "degraded",
          dependency: `Diagnostic of ${family.name}`,
          affects: "the completeness of this report",
        },
        `The checks of ${family.name} stopped on an unexpected error.`,
        "Copy this report and send it to the maintainers of Ekphrasis.",
        [message],
      ),
    );
  }
}
