/**
 * Spike on Ajv inside Obsidian: compiles schemas holding keywords prefixed `x-`, with `$ref` across
 * files, through `Ajv2020` with `strictSchema` disabled, and validates one instance.
 *
 * Decision record: schema dialect (`docs/adr/json-schema-dialect.md`).
 */
import Ajv2020 from "ajv/dist/2020";
import { TFile, type Plugin, type TAbstractFile } from "obsidian";
import { parse } from "yaml";
import commonSchema from "../../tests/fixtures/geonexus/schemas/common.schema.yaml";
import glossarySchema from "../../tests/fixtures/geonexus/schemas/glossary.schema.yaml";
import glossaryInstance from "../../tests/fixtures/geonexus/glossary.yml";
import { describeError, ms, showReport } from "./report";
import type { Spike } from "./spike";

type JsonSchema = Record<string, unknown>;

const SCHEMA_FILE = /\.(json|ya?ml)$/;

const parseSchema = (path: string, text: string): JsonSchema =>
  (path.endsWith(".json") ? JSON.parse(text) : parse(text)) as JsonSchema;

/** Compiles `main` after registering `references`, and reports each stage. */
function compileReport(
  main: JsonSchema,
  references: readonly JsonSchema[],
  instance: unknown,
): string[] {
  const lines: string[] = [];
  try {
    new Ajv2020().compile(main);
    lines.push("- Strict mode: compiled (no unknown keyword met).");
  } catch (error) {
    lines.push(
      `- Strict mode: rejected, as expected for keywords prefixed x-: ${describeError(error)}`,
    );
  }
  const ajv = new Ajv2020({ strictSchema: false, allErrors: true });
  for (const reference of references) ajv.addSchema(reference);
  const start = performance.now();
  try {
    const validate = ajv.compile(main);
    lines.push(
      `- Compilation with strictSchema disabled: succeeded in ${ms(performance.now() - start)}.`,
    );
    if (instance !== undefined) {
      validate(instance);
      const errors = validate.errors ?? [];
      lines.push(`- Validation of the instance: ${errors.length} error(s).`);
      for (const error of errors.slice(0, 10)) {
        lines.push(`  - ${error.instancePath || "/"}: ${error.message ?? error.keyword}`);
      }
    }
  } catch (error) {
    lines.push(`- Compilation with strictSchema disabled: FAILED: ${describeError(error)}`);
  }
  return lines;
}

/** Schema files of the folder holding `file`, the file itself excluded. */
function siblingSchemas(file: TFile): TFile[] {
  const siblings: readonly TAbstractFile[] = file.parent?.children ?? [];
  return siblings.filter(
    (sibling): sibling is TFile =>
      sibling instanceof TFile && sibling !== file && SCHEMA_FILE.test(sibling.path),
  );
}

export const ajvCompileSpike: Spike = {
  register(plugin: Plugin) {
    plugin.addCommand({
      id: "ajv-compile-bundled-schema",
      name: "Ajv: compile the bundled glossary schema and validate its instance",
      callback: () =>
        showReport(plugin.app, {
          title: "Ajv inside Obsidian (bundled fixture)",
          lines: compileReport(
            parse(glossarySchema) as JsonSchema,
            [parse(commonSchema) as JsonSchema],
            parse(glossaryInstance),
          ),
        }),
    });

    plugin.addCommand({
      id: "ajv-compile-active-schema",
      name: "Ajv: compile the active schema file with the schemas of its folder",
      checkCallback: (checking) => {
        const file = plugin.app.workspace.getActiveFile();
        if (!file || !SCHEMA_FILE.test(file.path)) return false;
        if (!checking) {
          void (async () => {
            const lines = [`- Schema: ${file.path}`];
            try {
              const vault = plugin.app.vault;
              const siblings = siblingSchemas(file);
              const references = await Promise.all(
                siblings.map(async (sibling) =>
                  parseSchema(sibling.path, await vault.cachedRead(sibling)),
                ),
              );
              lines.push(`- Schemas registered from the folder: ${siblings.length}.`);
              const main = parseSchema(file.path, await vault.cachedRead(file));
              lines.push(...compileReport(main, references, undefined));
            } catch (error) {
              lines.push(`- Reading or parsing failed: ${describeError(error)}`);
            }
            showReport(plugin.app, { title: "Ajv inside Obsidian (vault schema)", lines });
          })();
        }
        return true;
      },
    });
  },
};
