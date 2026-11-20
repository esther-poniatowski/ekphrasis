// @vitest-environment happy-dom
/**
 * Fields declaring `x-reference`: the control of the kind `reference` suggests the entries found
 * in the records of the vault, and validation reports a value naming no entry. Neither happens
 * while the records are not read yet.
 */
import { cleanup } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import type { ReferenceLookup } from "../../src/application";
import { MemoryFileSource } from "../support/fixture-vault";
import { element, renderForm } from "../support/rendered-form";

const SCHEMA = `
title: Task
type: object
properties:
  stream:
    type: string
    title: Stream
    x-reference: { schema: 'ex:catalog@1', collection: streams }
  backup:
    type: string
    title: Backup
    x-reference: { schema: 'ex:catalog@1', collection: streams }
  owner:
    type: string
    title: Owner
    x-kind: text
    x-reference: { schema: 'ex:team@1', collection: members, key: id }
  broken:
    type: string
    title: Broken
    x-reference: { schema: nope, collection: streams }
`;

const CATALOG: ReferenceLookup = (reference) =>
  reference.schema === "ex:catalog@1"
    ? { records: 1, identifiers: ["research", "teaching"] }
    : { records: 0, identifiers: [] };

afterEach(cleanup);

const render = (text: string, references: ReferenceLookup = CATALOG, schema = SCHEMA) =>
  renderForm(
    new MemoryFileSource({ "s.yaml": schema }),
    [{ pattern: "*.yml", schema: "s.yaml" }],
    "task.yml",
    text,
    true,
    {},
    null,
    references,
  );

const suggestions = (container: Element, path: string): string[] | null => {
  const input = element<HTMLInputElement>(container, `[data-path="${path}"] input`);
  const id = input.getAttribute("list");
  if (id === null) return null;
  const list = container.ownerDocument.getElementById(id);
  return list === null ? [] : Array.from(list.querySelectorAll("option"), (option) => option.value);
};

const text = (container: Element, path: string): string =>
  element(container, `[data-path="${path}"]`).textContent ?? "";

describe("reference fields", () => {
  it("draws the icon of the kind, and suggests the entries found, in each field of its own list", async () => {
    const { container } = await render("stream: research\nbackup:\n");
    expect(container.querySelector('[data-path="stream"] [data-icon="crosshair"]')).not.toBeNull();
    expect(suggestions(container, "stream")).toEqual(["research", "teaching"]);
    expect(suggestions(container, "backup")).toEqual(["research", "teaching"]);
    const lists = container.querySelectorAll("datalist");
    expect(new Set(Array.from(lists, (list) => list.id)).size).toBe(2);
    expect(text(container, "stream")).not.toContain("names no entry");
  });

  it("reports a value naming no entry, and an unfilled value not at all", async () => {
    const { container } = await render("stream: leisure\nbackup:\n");
    expect(text(container, "stream")).toContain(
      "leisure names no entry of streams, in the records bound to ex:catalog@1.",
    );
    expect(text(container, "backup")).not.toContain("names no entry");
  });

  it("checks a reference under a declared kind, without suggesting its entries", async () => {
    const { container } = await render("owner: ana\n");
    expect(container.querySelector('[data-path="owner"] [data-icon="text"]')).not.toBeNull();
    expect(container.querySelector('[data-path="owner"] datalist')).toBeNull();
    expect(text(container, "owner")).toContain(
      "No record bound to ex:team@1 is found in the vault, so ana names no entry.",
    );
  });

  it("neither suggests nor reports while the records are not read", async () => {
    const { container } = await render("stream: leisure\n", () => null);
    expect(suggestions(container, "stream")).toBeNull();
    expect(text(container, "stream")).not.toContain("names no entry");
  });

  it("suggests nothing in a read-only form", async () => {
    const { container } = await render(
      "stream: research\n",
      CATALOG,
      SCHEMA.replace("type: object", "type: object\nreadOnly: true"),
    );
    expect(suggestions(container, "stream")).toBeNull();
  });

  it("reports a malformed keyword as a defect of the schema, and keeps a text control", async () => {
    const { container } = await render("broken: research\n");
    expect(container.querySelector('[data-path="broken"] [data-icon="text"]')).not.toBeNull();
    expect(container.textContent).toContain("The keyword x-reference must name under schema");
  });
});
