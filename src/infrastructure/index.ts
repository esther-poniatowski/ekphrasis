/**
 * Public interface of the infrastructure layer.
 *
 * Implementations of application ports that depend on third-party libraries. The layer has no
 * dependency on the Obsidian API: host resources are reached through the `FileSource` port.
 */
export { YamlDocumentParser } from "./yaml-parser";
