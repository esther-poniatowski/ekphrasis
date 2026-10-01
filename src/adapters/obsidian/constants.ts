/**
 * Identifiers shared by the Obsidian adapters.
 */

export const YAML_EXTENSIONS: readonly string[] = ["yaml", "yml"];

export const isYamlExtension = (extension: string): boolean => YAML_EXTENSIONS.includes(extension);
