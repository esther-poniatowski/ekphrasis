/**
 * Vault in which a consumer root schema composes, by an absolute `$id` and `allOf`, the base
 * schema of a tool held in another folder: the base leaves the field `role` open, and the root
 * narrows it by an `enum`, fixes its own `_schema`, and repeats `x-identifier`. The registry of
 * version 2 maps the contract of the root and the absolute `$id` of the base.
 */
import { DEFAULT_SETTINGS, RegistryReader, type EkphrasisSettings } from "../../src/application";
import { FileSchemaLoader, YamlDocumentParser } from "../../src/infrastructure";
import type { MemoryFileSource } from "./fixture-vault";

export const BASE_URI = "https://example.org/tool/note@1/base.schema.yaml";
export const REGISTRY_PATH = "specs/schema-registry.yml";
export const ROOT_PATH = "schemas/note.schema.yaml";
export const BASE_PATH = ".schema-resources/tool/note/base.schema.yaml";
export const COMMON_PATH = ".schema-resources/tool/note/common.schema.yaml";

export const COMPOSED_SETTINGS: EkphrasisSettings = {
  ...DEFAULT_SETTINGS,
  schemaRegistry: REGISTRY_PATH,
};

export const COMPOSED_VAULT: Readonly<Record<string, string>> = {
  [REGISTRY_PATH]: [
    "schema_version: 2",
    "schemas:",
    `  'vault:note@1': '${ROOT_PATH}'`,
    "resources:",
    `  '${BASE_URI}': '${BASE_PATH}'`,
    "",
  ].join("\n"),
  [ROOT_PATH]: [
    "$id: note.schema.yaml",
    "allOf:",
    `  - $ref: '${BASE_URI}'`,
    "required: [_schema]",
    "x-identifier: id",
    "x-implements: 'tool:note@1'",
    "properties:",
    "  _schema: { const: 'vault:note@1' }",
    "  role: { enum: [lead, support] }",
    "",
  ].join("\n"),
  [BASE_PATH]: [
    `$id: '${BASE_URI}'`,
    "title: Note",
    "type: object",
    "required: [id]",
    "x-unfilled: [open]",
    "properties:",
    "  id: { $ref: 'common.schema.yaml#/$defs/id' }",
    "  role: { type: string, description: Role of the note. }",
    "  gloss: { type: string }",
    "",
  ].join("\n"),
  [COMMON_PATH]: [
    "$id: common.schema.yaml",
    "$defs:",
    "  id: { type: string, pattern: '^[a-z]+$' }",
    "",
  ].join("\n"),
};

/** Loader over `files`, resolving absolute URIs through the registry of `settings`. */
export function composedLoader(
  files: MemoryFileSource,
  settings: EkphrasisSettings = COMPOSED_SETTINGS,
): FileSchemaLoader {
  return new FileSchemaLoader(
    files,
    new RegistryReader(new YamlDocumentParser(), files, () => settings),
  );
}
