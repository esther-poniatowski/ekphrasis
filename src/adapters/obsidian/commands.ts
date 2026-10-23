/**
 * Commands of the plugin.
 */
import type { Plugin, Workspace } from "obsidian";
import type { RecordIdentifiers } from "../../application";
import { INSTANCE_VIEW_TYPE, isYamlExtension, OUTLINE_VIEW_TYPE } from "./constants";
import { registerCopyFieldLink } from "./copy-field-link";
import { InstanceView } from "./views/instance-view";
import { OutlineView } from "./views/outline-view";

/** Identifiers and names of the commands, shared with the notices that cite them. */
export const COMMANDS = {
  openInEkphrasis: { id: "open-in-ekphrasis", name: "Open in ekphrasis" },
  toggleView: { id: "toggle-form-source", name: "Toggle form and source view" },
  validate: { id: "validate-instance", name: "Validate instance" },
  collapseAll: { id: "collapse-all", name: "Collapse all" },
  expandAll: { id: "expand-all", name: "Expand all" },
  showOutline: { id: "show-outline", name: "Show outline" },
  searchFields: { id: "search-fields", name: "Search the fields" },
  toggleInstructions: { id: "toggle-all-instructions", name: "Show or hide all instructions" },
  copyFieldLink: { id: "copy-link-to-field", name: "Copy link to field" },
} as const;

/**
 * Outline view of the workspace, opened in the right sidebar when no leaf holds one, and revealed
 * so that its panel is visible.
 */
async function revealOutline(workspace: Workspace): Promise<OutlineView | null> {
  let leaf = workspace.getLeavesOfType(OUTLINE_VIEW_TYPE)[0] ?? null;
  if (leaf === null) {
    leaf = workspace.getRightLeaf(false);
    if (leaf === null) return null;
    await leaf.setViewState({ type: OUTLINE_VIEW_TYPE, active: false });
  }
  await workspace.revealLeaf(leaf);
  return leaf.view instanceof OutlineView ? leaf.view : null;
}

/** Registers the commands; *Copy link to field* reads the identifiers of the records. */
export function registerCommands(plugin: Plugin, identifiers: RecordIdentifiers): void {
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

  // Validates the active instance again, and reports the count of its issues.
  plugin.addCommand({
    ...COMMANDS.validate,
    checkCallback: (checking) => {
      const view = workspace.getActiveViewOfType(InstanceView);
      if (view === null) return false;
      if (!checking) void view.validate();
      return true;
    },
  });

  plugin.addCommand({
    ...COMMANDS.showOutline,
    callback: () => void revealOutline(workspace),
  });

  // Opens the outline with the focus in its search, for the form of the active instance.
  plugin.addCommand({
    ...COMMANDS.searchFields,
    callback: () => void revealOutline(workspace).then((view) => view?.focusSearch()),
  });

  // Fold or unfold every group and collection of the form of the active instance.
  for (const [command, folded] of [
    [COMMANDS.collapseAll, true],
    [COMMANDS.expandAll, false],
  ] as const) {
    plugin.addCommand({
      ...command,
      checkCallback: (checking) => {
        const view = workspace.getActiveViewOfType(InstanceView);
        if (view === null || view.mode !== "form") return false;
        if (!checking) view.foldAll(folded);
        return true;
      },
    });
  }

  // Shows the instructions of every field of the form, or hides them all.
  plugin.addCommand({
    ...COMMANDS.toggleInstructions,
    checkCallback: (checking) => {
      const view = workspace.getActiveViewOfType(InstanceView);
      if (view === null || view.mode !== "form") return false;
      if (!checking) view.toggleAllInstructions();
      return true;
    },
  });

  registerCopyFieldLink(plugin, COMMANDS.copyFieldLink, identifiers);
}
