/**
 * Checks of the route from the configured schema registry to the schemas of the forms: the
 * registry file and its version, the schema file of each contract with its references and its
 * composition, each resource mapped to an absolute `$id`, and the changes of generated schemas
 * that Obsidian does not report.
 *
 * Every file is read through the same `FileSource` as the forms, so a file that the diagnostic
 * cannot read is a file that the forms cannot read either.
 */
import {
  collectReferences,
  compositionConflicts,
  instanceValue,
  isJsonObject,
  isUri,
  parseReference,
  resolveVaultPath,
  SchemaView,
  SUPPORTED_REGISTRY_VERSIONS,
  type JsonValue,
  type SchemaSet,
} from "../../domain";
import { SchemaCompileError, SchemaError, YamlParseError } from "../../errors";
import type { DocumentParser, FileSource, SchemaLoader, SchemaValidator } from "../protocols";
import type { RegistryReader, RegistryState } from "../registry-reader";
import type { EkphrasisSettings } from "../settings";
import type { VaultInspector } from "./ports";
import { blocked, notPassed, passed, type CheckSubject, type DiagnosticCheck } from "./report";

export interface SchemaCheckDependencies {
  readonly settings: EkphrasisSettings;
  readonly registry: RegistryReader;
  readonly files: FileSource;
  readonly parser: DocumentParser;
  readonly loader: SchemaLoader;
  readonly validator: SchemaValidator;
  readonly vault: VaultInspector;
  /** Time at which the plugin loaded, in milliseconds, after which a change needs a restart. */
  readonly loadedAt: number;
  /** Whether the opened record declares `_schema`, which then requires a registry. */
  readonly recordDeclaresSchema: boolean;
}

/** Facts established by the schema checks, which the checks of records and checkers read. */
export interface SchemaFacts {
  readonly registry: RegistryState;
  /** Logical identifiers of the registry, empty when it cannot be read. */
  readonly identifiers: readonly string[];
  /** Vault paths of the registry and every schema reached from one of its mappings. */
  readonly generatedPaths: ReadonlySet<string>;
}

const FORMS_OF_SCHEMA_FIELD = "forms of the records that declare `_schema`";

const SUBJECTS = {
  setting: {
    id: "registry.setting",
    consequence: "forms",
    dependency: "Schema registry setting",
    affects: FORMS_OF_SCHEMA_FIELD,
  },
  read: {
    id: "registry.read",
    consequence: "forms",
    dependency: "Schema registry file",
    affects: FORMS_OF_SCHEMA_FIELD,
  },
  version: {
    id: "registry.version",
    consequence: "forms",
    dependency: "Schema registry version",
    affects: FORMS_OF_SCHEMA_FIELD,
  },
  contracts: {
    id: "registry.contracts",
    consequence: "forms",
    dependency: "Schema of each registered contract",
    affects: "forms of the records bound to a failing contract",
  },
  resources: {
    id: "registry.resources",
    consequence: "forms",
    dependency: "Schema file of each registered resource",
    affects: "forms whose schemas compose a failing resource",
  },
  references: {
    id: "schemas.references",
    consequence: "forms",
    dependency: "Absolute `$ref` values",
    affects: "forms whose schemas hold an unresolved reference",
  },
  composition: {
    id: "schemas.composition",
    consequence: "degraded",
    dependency: "Composition of schema layers by `allOf`",
    affects: "controls and standard validation of the fields concerned",
  },
  reload: {
    id: "resources.reload",
    consequence: "degraded",
    dependency: "Changes of generated schemas",
    affects: "open forms and links to records, which keep the schemas read at startup",
  },
} as const satisfies Record<string, CheckSubject>;

/** File named by the registry, read through the boundary of the forms, or why it cannot be. */
type Located =
  | { readonly status: "readable"; readonly path: string; readonly text: string }
  | { readonly status: "unreadable"; readonly reason: string; readonly hiddenPath?: string };

/** Schema of one contract or resource, loaded with its closure when it could be. */
interface LoadedSchema {
  readonly key: string;
  readonly path: string;
  readonly schemas: SchemaSet;
}

export async function schemaChecks(
  dependencies: SchemaCheckDependencies,
): Promise<{ readonly checks: readonly DiagnosticCheck[]; readonly facts: SchemaFacts }> {
  const { settings, registry: reader, vault } = dependencies;
  const checks: DiagnosticCheck[] = [];
  const state = await reader.read();
  const registryPath = state.status === "unconfigured" ? null : (state.path ?? null);
  const generated = new Set<string>(registryPath === null ? [] : [registryPath]);
  const facts = (identifiers: readonly string[]): SchemaFacts => ({
    registry: state,
    identifiers,
    generatedPaths: generated,
  });

  if (state.status === "unconfigured") {
    checks.push(
      dependencies.recordDeclaresSchema
        ? passed(
            SUBJECTS.setting,
            "No schema registry is configured; well-formed `_schema` identifiers remain unbound.",
          )
        : notPassed(
            "warning",
            SUBJECTS.setting,
            "No schema registry is configured; records bind to schemas only by a modeline or a path rule.",
            "If your project publishes a schema registry, enter its vault path under *Schema registry* in the settings of Ekphrasis.",
          ),
    );
    for (const subject of [SUBJECTS.read, SUBJECTS.version, SUBJECTS.contracts]) {
      checks.push(notApplicable(subject));
    }
    return { checks, facts: facts([]) };
  }
  checks.push(passed(SUBJECTS.setting, `The registry is \`${settings.schemaRegistry.trim()}\`.`));

  if (state.status === "invalid") {
    checks.push(registryFailure(state));
    checks.push(
      state.defect === "version"
        ? notPassed(
            "fail",
            SUBJECTS.version,
            `The registry ${state.reason.replace(/^the registry `[^`]*` /, "")}.`,
            `Regenerate the registry with a version that Ekphrasis reads (${supportedVersions()}), or update Ekphrasis.`,
            [state.reason],
          )
        : blocked(SUBJECTS.version, "the schema registry file"),
    );
    for (const subject of [SUBJECTS.contracts, SUBJECTS.resources, SUBJECTS.references]) {
      checks.push(blocked(subject, "the schema registry file"));
    }
    checks.push(blocked(SUBJECTS.composition, "the schema registry file"));
    return { checks, facts: facts([]) };
  }

  const { registry } = state;
  checks.push(passed(SUBJECTS.read, `The registry \`${state.path}\` parses.`));
  checks.push(
    passed(
      SUBJECTS.version,
      `The registry declares version ${registry.version}; Ekphrasis reads ${supportedVersions()}.`,
    ),
  );
  for (const target of [...registry.schemas.values(), ...registry.resources.values()]) {
    const path = isUri(target) ? null : resolveVaultPath("", target);
    if (path !== null && path !== "") generated.add(path);
  }

  const locate = locator(dependencies.files, vault);
  const contracts = await contractChecks(dependencies, registry.schemas, locate);
  const resources = await resourceChecks(dependencies, registry.resources, locate);
  for (const loaded of contracts.loaded) {
    for (const path of loaded.schemas.paths) generated.add(path);
  }
  for (const schemas of resources.loaded) {
    for (const path of schemas.paths) generated.add(path);
  }
  checks.push(contracts.check, resources.check);
  checks.push(
    referenceCheck(
      [...contracts.documents, ...resources.documents],
      registry.resources,
      state.path,
    ),
  );
  checks.push(compositionCheck(dependencies.validator, contracts.loaded));
  checks.push(await reloadCheck(vault, [...generated], dependencies.loadedAt));
  return { checks, facts: facts([...registry.schemas.keys()]) };
}

function supportedVersions(): string {
  return SUPPORTED_REGISTRY_VERSIONS.map(String).join(" and ");
}

function notApplicable(subject: CheckSubject): DiagnosticCheck {
  return passed(subject, "Not applicable: no schema registry is configured.");
}

/** Failure of the registry file, with the action that repairs its defect. */
function registryFailure(state: Extract<RegistryState, { status: "invalid" }>): DiagnosticCheck {
  const observed = `${capitalized(state.reason)}.`;
  switch (state.defect) {
    case "location":
      return notPassed(
        "fail",
        SUBJECTS.read,
        observed,
        "Enter under *Schema registry* a path from the root of the vault, such as `specs/schema-registry.yml`.",
      );
    case "absent":
      return notPassed(
        "fail",
        SUBJECTS.read,
        observed,
        "Generate the registry with the provisioning tool of your project, or correct the path under *Schema registry*.",
      );
    case "yaml":
      return notPassed(
        "fail",
        SUBJECTS.read,
        observed,
        "Open the registry in the source view, correct its YAML syntax, or generate it again.",
      );
    case "version":
      return passed(SUBJECTS.read, `The registry \`${state.path ?? ""}\` parses.`);
    case "structure":
      return notPassed(
        "fail",
        SUBJECTS.read,
        observed,
        "Generate the registry again with the provisioning tool of your project; a registry holds a mapping `schemas`, and from version 2 a mapping `resources` of absolute URIs.",
      );
  }
}

/** Reads a target of the registry through the file boundary of the forms. */
function locator(files: FileSource, vault: VaultInspector): (target: string) => Promise<Located> {
  return async (target) => {
    if (isUri(target)) return { status: "unreadable", reason: "is a web address, never fetched" };
    const path = resolveVaultPath("", target);
    if (path === null || path === "") {
      return { status: "unreadable", reason: "leaves the vault" };
    }
    const text =
      files.readSchema === undefined ? await files.read(path) : await files.readSchema(path, true);
    if (text !== null) return { status: "readable", path, text };
    if (!(await vault.exists(path))) return { status: "unreadable", reason: "is absent" };
    return {
      status: "unreadable",
      reason: "exists, but the guarded schema reader refuses it",
      hiddenPath: path,
    };
  };
}

interface ParsedDocument {
  readonly path: string;
  readonly root: JsonValue;
}

/** Contract schemas: each file read, its closure loaded, and its `_schema` constant compared. */
async function contractChecks(
  dependencies: SchemaCheckDependencies,
  contracts: ReadonlyMap<string, string>,
  locate: (target: string) => Promise<Located>,
): Promise<{
  readonly check: DiagnosticCheck;
  readonly loaded: readonly LoadedSchema[];
  readonly documents: readonly ParsedDocument[];
  readonly hidden: readonly string[];
}> {
  const failures: string[] = [];
  const loaded: LoadedSchema[] = [];
  const documents: ParsedDocument[] = [];
  const hidden: string[] = [];
  for (const [id, target] of contracts) {
    const located = await locate(target);
    if (located.status === "unreadable") {
      failures.push(`\`${id}\` → \`${target}\`: the file ${located.reason}.`);
      if (located.hiddenPath !== undefined) hidden.push(located.hiddenPath);
      continue;
    }
    const parsed = parseDocument(dependencies.parser, located);
    if (parsed !== null) documents.push(parsed);
    let schemas: SchemaSet;
    try {
      schemas = await dependencies.loader.load(located.path);
    } catch (error) {
      if (!(error instanceof SchemaError)) throw error;
      failures.push(`\`${id}\` → \`${located.path}\`: ${error.message}`);
      continue;
    }
    const declared = SchemaView.root(schemas)
      .properties()
      .find(({ key }) => key === "_schema")?.schema.constValue?.value;
    if (declared !== id) {
      const written = declared === undefined ? "absent" : `\`${String(declared)}\``;
      failures.push(
        `\`${id}\` → \`${located.path}\`: the constant of the property \`_schema\` is ${written}.`,
      );
      continue;
    }
    loaded.push({ key: id, path: located.path, schemas });
  }
  const total = contracts.size;
  const check =
    failures.length === 0
      ? passed(
          SUBJECTS.contracts,
          `${total} ${plural(total, "contract")} of the registry each resolve to one schema that loads with its references.`,
        )
      : notPassed(
          "fail",
          SUBJECTS.contracts,
          `${failures.length} of ${total} ${plural(total, "contract")} do not resolve to a loadable schema; the first: ${failures[0]}`,
          "Generate the schemas and the registry again with the provisioning tool of your project, so that each contract names an existing schema declaring that contract.",
          failures,
        );
  return { check, loaded, documents, hidden };
}

/** Resources: each file read and its root `$id` compared with the URI that maps to it. */
async function resourceChecks(
  dependencies: SchemaCheckDependencies,
  resources: ReadonlyMap<string, string>,
  locate: (target: string) => Promise<Located>,
): Promise<{
  readonly check: DiagnosticCheck;
  readonly documents: readonly ParsedDocument[];
  readonly loaded: readonly SchemaSet[];
  readonly hidden: readonly string[];
}> {
  const failures: string[] = [];
  const documents: ParsedDocument[] = [];
  const loaded: SchemaSet[] = [];
  const hidden: string[] = [];
  for (const [uri, target] of resources) {
    const located = await locate(target);
    if (located.status === "unreadable") {
      failures.push(`\`${uri}\` → \`${target}\`: the file ${located.reason}.`);
      if (located.hiddenPath !== undefined) hidden.push(located.hiddenPath);
      continue;
    }
    const parsed = parseDocument(dependencies.parser, located);
    if (parsed === null) {
      failures.push(`\`${uri}\` → \`${located.path}\`: the file is not valid JSON or YAML.`);
      continue;
    }
    documents.push(parsed);
    try {
      loaded.push(await dependencies.loader.load(located.path));
    } catch (error) {
      if (!(error instanceof SchemaError)) throw error;
      failures.push(`\`${uri}\` → \`${located.path}\`: ${error.message}`);
      continue;
    }
    const id = isJsonObject(parsed.root) ? parsed.root["$id"] : undefined;
    if (id !== uri) {
      const written = typeof id === "string" ? `\`${id}\`` : "absent";
      failures.push(
        `\`${uri}\` → \`${located.path}\`: the root \`$id\` of the file is ${written}.`,
      );
    }
  }
  const total = resources.size;
  const check =
    failures.length === 0
      ? passed(
          SUBJECTS.resources,
          total === 0
            ? "The registry maps no resource."
            : `${total} ${plural(total, "resource")} of the registry each resolve to a file declaring its \`$id\`.`,
        )
      : notPassed(
          "fail",
          SUBJECTS.resources,
          `${failures.length} of ${total} ${plural(total, "resource")} do not resolve; the first: ${failures[0]}`,
          "Materialize the schema resources again with the provisioning tool of your project.",
          failures,
        );
  return { check, documents, loaded, hidden };
}

function parseDocument(
  parser: DocumentParser,
  located: Extract<Located, { status: "readable" }>,
): ParsedDocument | null {
  try {
    return { path: located.path, root: instanceValue(parser.parse(located.text)) };
  } catch (error) {
    if (error instanceof YamlParseError) return null;
    throw error;
  }
}

/**
 * Each absolute `$ref` written in a file of the registry resolves through its resources, or to a
 * file of the registry declaring that URI as its `$id`, as the loader resolves it.
 */
function referenceCheck(
  documents: readonly ParsedDocument[],
  resources: ReadonlyMap<string, string>,
  registryPath: string,
): DiagnosticCheck {
  const declared = new Set(
    documents.flatMap(({ root }) =>
      isJsonObject(root) && typeof root["$id"] === "string" ? [root["$id"]] : [],
    ),
  );
  const seen = new Set<string>();
  const unresolved: string[] = [];
  let count = 0;
  for (const document of documents) {
    for (const reference of collectReferences(document.root)) {
      const target = parseReference(reference, document.path)?.document ?? null;
      if (target === null || !isUri(target)) continue;
      count += seen.has(target) ? 0 : 1;
      seen.add(target);
      if (!resources.has(target) && !declared.has(target)) {
        unresolved.push(`\`${target}\`, referenced from \`${document.path}\``);
      }
    }
  }
  if (unresolved.length === 0) {
    return passed(
      SUBJECTS.references,
      count === 0
        ? "The schemas of the registry hold no absolute `$ref`."
        : `${count} absolute ${plural(count, "URI")} referenced by the schemas resolve through the registry \`${registryPath}\`.`,
    );
  }
  return notPassed(
    "fail",
    SUBJECTS.references,
    `${unresolved.length} absolute ${plural(unresolved.length, "reference")} resolve through no entry of \`resources\` and no loaded \`$id\`; the first: ${unresolved[0]}.`,
    `Add each URI under \`resources\` of the registry \`${registryPath}\`, mapped to its schema file, by generating the registry again with the provisioning tool of your project.`,
    unresolved,
  );
}

/** Conflicts of composed layers and refusals of the validator, for every loaded contract. */
function compositionCheck(
  validator: SchemaValidator,
  loaded: readonly LoadedSchema[],
): DiagnosticCheck {
  const defects: string[] = [];
  for (const { key, schemas } of loaded) {
    for (const conflict of compositionConflicts(SchemaView.root(schemas))) {
      defects.push(`\`${key}\` at \`${conflict.path || "(root)"}\`: ${conflict.message}`);
    }
    try {
      validator.compile(schemas);
    } catch (error) {
      if (!(error instanceof SchemaCompileError)) throw error;
      defects.push(`\`${key}\`: the validator refuses the schema: ${error.message}`);
    }
  }
  if (defects.length === 0) {
    return passed(
      SUBJECTS.composition,
      `The layers of ${loaded.length} loaded ${plural(loaded.length, "contract")} compose, and the validator compiles each.`,
    );
  }
  return notPassed(
    "warning",
    SUBJECTS.composition,
    `${defects.length} composition ${plural(defects.length, "defect")}; the first: ${defects[0]}`,
    "Report the defect to the maintainers of the schemas; meanwhile the form follows the nearest declaration of each field, and the standard validation may report values that the control admits.",
    defects,
  );
}

/**
 * Generated schemas changed since the plugin loaded, in a directory that Obsidian does not index:
 * no event reports such a change, so the open forms and the index of identifiers keep the schemas
 * read before it.
 */
async function reloadCheck(
  vault: VaultInspector,
  generated: readonly string[],
  loadedAt: number,
): Promise<DiagnosticCheck> {
  const hidden = generated.filter((path) => !vault.isIndexedFile(path));
  if (hidden.length === 0) {
    return passed(
      SUBJECTS.reload,
      "Obsidian indexes every schema named by the registry, so their changes reopen dependent forms.",
    );
  }
  const changed: string[] = [];
  for (const path of hidden) {
    const modified = await vault.modifiedAt(path);
    if (modified !== null && modified > loadedAt) changed.push(path);
  }
  if (changed.length === 0) {
    return passed(
      SUBJECTS.reload,
      `Obsidian does not index ${hidden.length} mapped ${plural(hidden.length, "schema")}, so Ekphrasis sees their changes only after a restart; none changed since Ekphrasis loaded.`,
    );
  }
  return notPassed(
    "warning",
    SUBJECTS.reload,
    `${changed.length} generated ${plural(changed.length, "schema")} changed after Ekphrasis loaded, and Obsidian reports no event for their hidden paths.`,
    "Restart Obsidian, or disable and enable Ekphrasis, so that the open forms and the links to records read the changed schemas.",
    changed,
  );
}

function plural(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
