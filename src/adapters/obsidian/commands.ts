/**
 * Commands of the plugin.
 */
import type { Plugin } from "obsidian";
import { INSTANCE_VIEW_TYPE, isYamlExtension } from "./constants";
import { InstanceView } from "./views/instance-view";

/** Identifiers and names of the commands, shared with the notices that cite them. */
export const COMMANDS = {
  openInEkphrasis: { id: "open-in-ekphrasis", name: "Open in ekphrasis" },
  toggleView: { id: "toggle-form-source", name: "Toggle form and source view" },
} as const;

export function registerCommands(plugin: Plugin): void {
  const { workspace } = plugin.app;

  // Opens the active YAML file in the view of ekphrasis, whichever plugin owns its extension.
  plugin.addCommand({
    ...COMMANDS.openInEkphrasis,
    checkCallback: (checking) => {
      const file = workspace.getActiveFile();
      if (file === null || !isYamlExtension(file.extension)) return false;
      if (workspace.getActiveViewOfType(InstanceView)?.file === file) return false;
      if (!checking) {
        void workspace
          .getLeaf(false)
          .setViewState({ type: INSTANCE_VIEW_TYPE, state: { file: file.path }, active: true });
      }
      return true;
    },
  });

  plugin.addCommand({
    ...COMMANDS.toggleView,
    checkCallback: (checking) => {
      const view = workspace.getActiveViewOfType(InstanceView);
      if (view === null) return false;
      if (!checking) view.toggleMode();
      return true;
    },
  });
}
