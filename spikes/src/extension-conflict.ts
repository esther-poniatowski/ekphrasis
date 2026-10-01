/**
 * Spike on the extension conflict: registers `.yaml` and `.yml` for a minimal view, and reports
 * whether the registration succeeded and which view type Obsidian now associates with each
 * extension.
 *
 * Decision record: plain YAML instances (`docs/adr/plain-yaml-instances.md`).
 */
import { TextFileView, type App, type Plugin, type WorkspaceLeaf } from "obsidian";
import { describeError, showReport } from "./report";
import type { Spike } from "./spike";

const VIEW_TYPE = "ekphrasis-spikes-plain-yaml";
const EXTENSIONS = ["yaml", "yml"];

/** Read-only view showing the raw text, so that the view opened for a file is recognizable. */
class PlainYamlView extends TextFileView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  override getViewType(): string {
    return VIEW_TYPE;
  }

  override getDisplayText(): string {
    return this.file?.name ?? "YAML (spike)";
  }

  override getViewData(): string {
    return this.data;
  }

  override setViewData(data: string): void {
    this.data = data;
    this.contentEl.empty();
    this.contentEl.createEl("p", { text: "Opened by the view of ekphrasis-spikes." });
    this.contentEl.createEl("pre", { text: data });
  }

  override clear(): void {
    this.contentEl.empty();
  }
}

/**
 * View type associated with an extension. The view registry is a private API of Obsidian, read
 * here only to observe the outcome of the conflict; production code must not rely on it.
 */
function viewTypeOf(app: App, extension: string): string {
  const registry = (
    app as unknown as {
      viewRegistry?: { getTypeByExtension?: (extension: string) => string | undefined };
    }
  ).viewRegistry;
  return registry?.getTypeByExtension?.(extension) ?? "(unavailable: private API changed)";
}

export const extensionConflictSpike: Spike = {
  register(plugin: Plugin) {
    plugin.registerView(VIEW_TYPE, (leaf) => new PlainYamlView(leaf));
    let outcome: string;
    try {
      plugin.registerExtensions(EXTENSIONS, VIEW_TYPE);
      outcome = "registerExtensions returned without throwing";
    } catch (error) {
      outcome = `registerExtensions threw ${describeError(error)}`;
    }

    plugin.addCommand({
      id: "report-extension-registration",
      name: "Extension conflict: report the registration of .yaml and .yml",
      callback: () =>
        showReport(plugin.app, {
          title: "Extension conflict",
          lines: [
            `- Registration by ekphrasis-spikes: ${outcome}.`,
            ...EXTENSIONS.map(
              (extension) => `- View type of .${extension}: ${viewTypeOf(plugin.app, extension)}`,
            ),
            `- View type of ekphrasis-spikes: ${VIEW_TYPE}`,
          ],
        }),
    });
  },
};
