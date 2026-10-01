/**
 * Identifiers shared by the Obsidian adapters.
 */

export const YAML_EXTENSIONS: readonly string[] = ["yaml", "yml"];

export const isYamlExtension = (extension: string): boolean => YAML_EXTENSIONS.includes(extension);

/** Type of the view that hosts the form view and the source view of an instance. */
export const INSTANCE_VIEW_TYPE = "ekphrasis-instance";

/**
 * Plugins known to register the YAML extensions, named in the notice of a refused registration:
 * Obsidian reports no owner, so the notice can only name the candidates.
 */
export const KNOWN_EXTENSION_OWNERS: readonly string[] = ["YAML Editor", "YAML Databases"];

/** Icons of the Lucide set bundled with Obsidian. */
export const ICONS = {
  instance: "file-code",
  formView: "layout-list",
  sourceView: "code-2",
} as const;
