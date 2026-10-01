/**
 * Registration of the YAML extensions for the view of ekphrasis, tolerant of a refusal.
 *
 * Obsidian assigns each extension to the first plugin that registers it, and throws on every
 * later registration; an uncaught throw in `onload` would stop the plugin from loading. Each
 * extension is therefore registered on its own, so one refused extension leaves the other
 * registered.
 */
import { KNOWN_EXTENSION_OWNERS } from "./constants";

/** Registers each of `extensions` through `register`, and returns the refused ones. */
export function registerExtensions(
  extensions: readonly string[],
  register: (extensions: string[]) => void,
): string[] {
  return extensions.filter((extension) => {
    try {
      register([extension]);
      return false;
    } catch (error) {
      console.warn(`ekphrasis: registration of ".${extension}" refused.`, error);
      return true;
    }
  });
}

/** Text of the notice reporting the extensions owned by another plugin. */
export function refusalNotice(refused: readonly string[], commandName: string): string {
  const extensions = refused.map((extension) => `.${extension}`).join(" and ");
  return (
    `Ekphrasis: another plugin already opens ${extensions} files, ` +
    `for instance ${KNOWN_EXTENSION_OWNERS.join(" or ")}. ` +
    `Use the command "${commandName}" to open such a file as a form, ` +
    `or disable the other plugin and reload Obsidian.`
  );
}
