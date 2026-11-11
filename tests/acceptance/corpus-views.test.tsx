// @vitest-environment happy-dom
/**
 * Optional corpus test of the generated views of Gnomon, on the project named by the environment
 * variable `EKPHRASIS_CORPUS`, read and never modified. Gnomon owns the views and their schemas,
 * so this test copies none of them: it reads the identifiers of the views from the key `exports`
 * of the version 2 registry, and the views themselves from the files that name one of them.
 *
 * - Each exported view schema resolves through the registry, loads through the schema loader of
 *   the plugin, builds a form without schema issue, and locks every field read-only.
 * - Each view found under the corpus, or under the folder named by `EKPHRASIS_VIEWS`, opens
 *   through the form service without schema issue, validation issue, value of another shape or
 *   key outside the schema, and renders without a control that changes it. The folder holds the
 *   output of `gnomon views`, generated outside the corpus so that the corpus stays unmodified.
 *   When the folder is named, every current view schema must have a view in it.
 * - When the folder is named, each list of scalars in a table cell of a view displays as one
 *   summary holding one token per item, in the order of the file, without the section, the
 *   inputs or the buttons of a list. At least one such cell must exist among the views.
 * - Literal labels and LaTeX in table cells use compact read-only presentations, with LaTeX
 *   rendered inline. Tables are keyboard-scrollable regions, so a large result keeps its header
 *   and every row available within the form.
 * - Every field declared as a graph first renders the route connected to its declared root, then
 *   renders every node and directed relation on request. The test names no operational field of
 *   Gnomon.
 *
 * Each failure names the identifier of the schema, or the file of the view, and the field path.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  DEFAULT_SETTINGS,
  FormService,
  RegistryReader,
  type FormState,
} from "../../src/application";
import type { Field } from "../../src/domain";
import { FileSchemaLoader, YamlDocumentParser } from "../../src/infrastructure";
import { DirectoryFileSource } from "../support/fixture-vault";
import { editableControls, renderForm } from "../support/rendered-form";
import { createValidation } from "../support/validation";
import { CORPUS_VARIABLE, readYamlFiles, type YamlFile } from "../support/yaml-files";

/** Environment variable naming a folder of views generated from the corpus, outside of it. */
const VIEWS_VARIABLE = "EKPHRASIS_VIEWS";
const REGISTRY = "specs/schema-registry.yml";
const VIEW_PREFIX = "gnomon:view.";
const VERSIONED = /^(.+)@(\d+)$/;
const SCHEMA_LINE = /^_schema:\s*["']?([^"'\s#]+)/m;

const corpusRoot = process.env[CORPUS_VARIABLE];
const viewsRoot = process.env[VIEWS_VARIABLE];
const hasRegistry = corpusRoot !== undefined && existsSync(join(corpusRoot, REGISTRY));
const settings = { ...DEFAULT_SETTINGS, schemaRegistry: REGISTRY };

/** Identifiers of the view schemas that the registry exports, in their written order. */
function exportedViews(): string[] {
  if (!hasRegistry) return [];
  const registry = parse(readFileSync(join(corpusRoot ?? "", REGISTRY), "utf8")) as {
    exports?: unknown;
  };
  const exports = Array.isArray(registry.exports) ? registry.exports : [];
  return exports.filter(
    (entry): entry is string => typeof entry === "string" && entry.startsWith(VIEW_PREFIX),
  );
}

/** Highest exported version of each view schema, which `gnomon views` writes. */
function currentViews(identifiers: readonly string[]): string[] {
  if (!hasRegistry) return [];
  const registry = parse(readFileSync(join(corpusRoot ?? "", REGISTRY), "utf8")) as {
    schemas?: Record<string, unknown>;
  };
  const latest = new Map<string, { identifier: string; version: number }>();
  for (const identifier of identifiers) {
    const path = registry.schemas?.[identifier];
    if (typeof path === "string" && path.includes("/compatibility/")) continue;
    const match = VERSIONED.exec(identifier);
    if (match === null) continue;
    const [, family = "", version = "0"] = match;
    const known = latest.get(family);
    if (known === undefined || Number(version) > known.version) {
      latest.set(family, { identifier, version: Number(version) });
    }
  }
  return [...latest.values()].map(({ identifier }) => identifier);
}

interface ViewFile extends YamlFile {
  readonly identifier: string;
}

/** Files under `root` whose key `_schema` names one of `identifiers`. */
function viewFiles(root: string | undefined, identifiers: ReadonlySet<string>): ViewFile[] {
  if (root === undefined || !existsSync(root)) return [];
  return readYamlFiles(root).flatMap((file) => {
    const identifier = SCHEMA_LINE.exec(file.text)?.[1];
    return identifier !== undefined && identifiers.has(identifier) ? [{ ...file, identifier }] : [];
  });
}

/** The field, then every field below it: children, items, templates and alternatives. */
function* fieldsOf(field: Field): Generator<Field> {
  yield field;
  if ("children" in field) {
    for (const child of field.children) yield* fieldsOf(child);
    for (const alternative of field.alternativeChildren) {
      for (const child of alternative) yield* fieldsOf(child);
    }
    if (field.entryTemplate !== null) yield* fieldsOf(field.entryTemplate);
  }
  if ("items" in field) {
    for (const item of field.items) yield* fieldsOf(item);
    if (field.next !== null) yield* fieldsOf(field.next);
  }
}

/** Failures of an opened form, each prefixed by `subject`: the stage that stopped, or its defects. */
function formFailures(subject: string, state: FormState, instance: boolean): string[] {
  if (state.status !== "form") {
    const reason =
      state.status === "schema-error"
        ? state.error.message
        : state.status === "invalid-binding"
          ? state.reason
          : state.status;
    return [`${subject}: the form does not open (${state.status}: ${reason})`];
  }
  const failures = [...state.model.schemaIssues, ...state.report.schemaIssues].map(
    ({ path, message }) => `${subject}:${path}: schema issue: ${message}`,
  );
  for (const field of fieldsOf(state.model.root)) {
    if (field.lock !== "read-only") failures.push(`${subject}:${field.id}: editable field`);
    if (!instance) continue;
    if (field.mismatch !== null) failures.push(`${subject}:${field.id}: value of another shape`);
    if ("extraEntries" in field) {
      for (const entry of field.extraEntries) {
        failures.push(`${subject}:${entry.id}: key outside the schema`);
      }
    }
  }
  if (instance) {
    for (const issue of state.report.issues) {
      failures.push(`${subject}:${issue.id}: ${issue.checker}: ${issue.message}`);
    }
  }
  return failures;
}

afterEach(cleanup);

describe.skipIf(!hasRegistry)(`gnomon views named by ${CORPUS_VARIABLE}`, () => {
  const root = corpusRoot ?? "";
  const files = new DirectoryFileSource(root);
  const parser = new YamlDocumentParser();
  const registry = new RegistryReader(parser, files, () => settings);
  const forms = new FormService(
    parser,
    new FileSchemaLoader(files, registry),
    createValidation(),
    () => settings,
    files,
  );
  const exported = exportedViews();
  const current = currentViews(exported);
  const identifiers = new Set(exported);
  const views = hasRegistry
    ? [...viewFiles(root, identifiers), ...viewFiles(viewsRoot, identifiers)]
    : [];

  it("exports view schemas", () => {
    expect(exported.length).toBeGreaterThan(0);
    expect(current.length).toBeGreaterThan(0);
  });

  it.each(exported)("loads %s through the registry, read-only from its root", async (id) => {
    const state = await registry.read();
    expect(state.status).toBe("read");
    if (state.status !== "read") return;
    expect(state.registry.schemas.get(id), `${id}: the registry maps no schema`).toBeDefined();
    const opened = await forms.open(`${id}.yml`, `_schema: ${id}\n`);
    const failures = formFailures(id, opened, false);
    expect(failures, failures.join("\n")).toEqual([]);
  });

  it.skipIf(viewsRoot === undefined)(
    `finds a view of every current view schema under ${VIEWS_VARIABLE}`,
    () => {
      const found = new Set(views.map(({ identifier }) => identifier));
      expect(current.filter((identifier) => !found.has(identifier))).toEqual([]);
    },
  );

  it.skipIf(viewsRoot === undefined)(
    "renders schema-declared graphs without consumer-specific field names",
    async () => {
      const failures: string[] = [];
      let graphs = 0;
      let nodes = 0;
      let edges = 0;
      for (const { name, identifier, text } of views) {
        const state = await forms.open(name, text);
        if (state.status !== "form") continue;
        const graphFields = Array.from(fieldsOf(state.model.root)).filter(
          (field) => field.kind === "graph" && "children" in field,
        );
        const { container } = await renderForm(files, [], name, text, true, settings);
        const renderedGraphs = Array.from(
          container.querySelectorAll<HTMLElement>(".ekphrasis-graph-viewport"),
        );
        if (renderedGraphs.length !== graphFields.length) {
          failures.push(
            `${identifier} in ${name}: ${renderedGraphs.length} rendered graphs for ${graphFields.length} fields`,
          );
        }
        graphFields.forEach((field, index) => {
          const rendered = renderedGraphs[index];
          if (rendered === undefined || !("children" in field)) return;
          graphs += 1;
          const nodeField = field.children.find((child) => child.graphRole === "nodes");
          const edgeField = field.children.find((child) => child.graphRole === "edges");
          const expectedNodes =
            nodeField !== undefined && "items" in nodeField ? nodeField.items : [];
          const expectedEdges =
            edgeField !== undefined && "items" in edgeField ? edgeField.items : [];
          const initialNodes = Array.from(
            rendered.querySelectorAll<HTMLElement>(".ekphrasis-graph-node"),
          );
          if (initialNodes.length === 0 || initialNodes.length > expectedNodes.length) {
            failures.push(
              `${identifier} in ${name}:${field.id}: invalid initial scope of ${initialNodes.length} nodes for ${expectedNodes.length} rows`,
            );
          }
          const section = rendered.closest<HTMLElement>(".ekphrasis-graph-section");
          const showWhole = Array.from(section?.querySelectorAll("button") ?? []).find(
            (button) => button.textContent === "Show whole graph",
          );
          if (showWhole !== undefined) fireEvent.click(showWhole);
          const renderedNodes = Array.from(
            rendered.querySelectorAll<HTMLElement>(".ekphrasis-graph-node"),
          );
          const renderedEdges = Array.from(
            rendered.querySelectorAll<HTMLElement>(".ekphrasis-graph-edges > g"),
          );
          nodes += renderedNodes.length;
          edges += renderedEdges.length;
          if (renderedNodes.length !== expectedNodes.length) {
            failures.push(
              `${identifier} in ${name}:${field.id}: ${renderedNodes.length} nodes for ${expectedNodes.length} rows`,
            );
          }
          if (renderedEdges.length !== expectedEdges.length) {
            failures.push(
              `${identifier} in ${name}:${field.id}: ${renderedEdges.length} edges for ${expectedEdges.length} rows`,
            );
          }
        });
        cleanup();
      }
      expect(graphs, "no schema-declared graph field").toBeGreaterThan(0);
      expect(nodes, "no rendered graph node").toBeGreaterThan(0);
      expect(edges, "no rendered graph edge").toBeGreaterThan(0);
      expect(failures, failures.join("\n")).toEqual([]);
    },
  );

  it.skipIf(viewsRoot === undefined)(
    "displays each list of scalars in a table cell as one summary of its items",
    async () => {
      const failures: string[] = [];
      let cells = 0;
      for (const { name, identifier, text } of views) {
        const state = await forms.open(name, text);
        if (state.status !== "form") continue;
        const byId = new Map(Array.from(fieldsOf(state.model.root), (field) => [field.id, field]));
        const { container } = await renderForm(files, [], name, text, true, settings);
        for (const cell of Array.from(container.querySelectorAll('td[data-kind="list"]'))) {
          cells += 1;
          const id = cell.getAttribute("data-path") ?? "";
          const subject = `${identifier} in ${name}:${id}`;
          const field = byId.get(id);
          const items = field !== undefined && "items" in field ? field.items : [];
          const expected = items.map((item) =>
            "value" in item && item.value !== null ? String(item.value) : "—",
          );
          const shown = Array.from(
            cell.querySelectorAll(".ekphrasis-cell-item"),
            (token) => token.textContent,
          );
          if (cell.querySelector(".ekphrasis-cell-list") === null) {
            failures.push(`${subject}: no summary`);
          } else if (JSON.stringify(shown) !== JSON.stringify(expected)) {
            failures.push(`${subject}: tokens ${JSON.stringify(shown)}`);
          }
          if (cell.querySelector(".ekphrasis-group, .ekphrasis-add, input, textarea") !== null) {
            failures.push(`${subject}: controls of a list`);
          }
        }
        cleanup();
      }
      expect(cells, "no list of scalars in a table cell").toBeGreaterThan(0);
      expect(failures, failures.join("\n")).toEqual([]);
    },
  );

  it.skipIf(viewsRoot === undefined)(
    "presents labels and LaTeX compactly and makes large tables keyboard-scrollable",
    async () => {
      const failures: string[] = [];
      let labels = 0;
      let formulas = 0;
      let largeTables = 0;
      for (const { name, identifier, text } of views) {
        const state = await forms.open(name, text);
        if (state.status !== "form") continue;
        const byId = new Map(Array.from(fieldsOf(state.model.root), (field) => [field.id, field]));
        const { container } = await renderForm(files, [], name, text, true, settings);
        for (const cell of Array.from(container.querySelectorAll('td[data-kind="label"]'))) {
          labels += 1;
          const id = cell.getAttribute("data-path") ?? "";
          const subject = `${identifier} in ${name}:${id}`;
          const field = byId.get(id);
          const raw =
            field !== undefined && "value" in field && !field.unfilled && field.value !== null
              ? String(field.value)
              : "";
          const expected = raw === "" ? "—" : raw;
          const shown = cell.querySelector(".ekphrasis-cell-label")?.textContent;
          if (shown !== expected) {
            failures.push(
              `${subject}: label shows ${JSON.stringify(shown)}, expected ${JSON.stringify(expected)}`,
            );
          }
          if (cell.querySelector("input, textarea, select") !== null) {
            failures.push(`${subject}: label displays an editor`);
          }
        }
        for (const cell of Array.from(container.querySelectorAll('td[data-kind="latex"]'))) {
          formulas += 1;
          const id = cell.getAttribute("data-path") ?? "";
          const subject = `${identifier} in ${name}:${id}`;
          if (cell.querySelector('.ekphrasis-rendered[data-display="inline"]') === null) {
            failures.push(`${subject}: LaTeX is not rendered inline`);
          }
          if (cell.querySelector("input, textarea, select") !== null) {
            failures.push(`${subject}: LaTeX displays an editor`);
          }
        }
        for (const table of Array.from(container.querySelectorAll(".ekphrasis-table"))) {
          const rows = table.querySelectorAll("tbody > tr").length;
          if (rows <= 20) continue;
          largeTables += 1;
          const region = table.closest(".ekphrasis-table-scroll");
          if (
            region?.getAttribute("role") !== "region" ||
            region.getAttribute("tabindex") !== "0"
          ) {
            failures.push(`${identifier} in ${name}: ${rows}-row table is not keyboard-scrollable`);
          }
        }
      }
      expect(labels).toBeGreaterThan(0);
      expect(formulas).toBeGreaterThan(0);
      expect(largeTables).toBeGreaterThan(0);
      expect(failures, failures.join("\n")).toEqual([]);
    },
  );

  it.each(views)(
    "opens $name ($identifier) without issue and without an editable control",
    async ({ name, identifier, text }) => {
      const subject = `${identifier} in ${name}`;
      const failures = formFailures(subject, await forms.open(name, text), true);
      const { container } = await renderForm(files, [], name, text, true, settings);
      failures.push(
        ...editableControls(container).map(
          (control) =>
            `${subject}:${control.closest("[data-path]")?.getAttribute("data-path") ?? ""}: ` +
            `editable control ${control.tagName.toLowerCase()}`,
        ),
      );
      expect(failures, failures.join("\n")).toEqual([]);
    },
  );
});
