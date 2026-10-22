/**
 * Spike on the subpath of a followed link: does Obsidian pass the subpath of a link such as
 * `[[record.yml#task.aim]]` to the view of a plugin opening a YAML file, and under which key?
 *
 * The declarations of the API state only that `View.setEphemeralState(state)` exists and that
 * `OpenViewState.eState` carries an ephemeral state. The spike registers the extensions `.yaml`
 * and `.yml` for a view of its own, which records every state it receives. Ekphrasis must be
 * disabled meanwhile, since it registers the same extensions.
 */
import { TextFileView, type Plugin, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import type { SpikeReport } from "./report";

const NAME = "subpath";
const VIEW_TYPE = "ekphrasis-spike-yaml";

class RecordingView extends TextFileView {
  private text = "";

  constructor(
    leaf: WorkspaceLeaf,
    private readonly report: SpikeReport,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  override getDisplayText(): string {
    return this.file?.basename ?? "Spike view";
  }

  getViewData(): string {
    return this.text;
  }

  setViewData(data: string): void {
    this.text = data;
    this.contentEl.empty();
    this.contentEl.createEl("p", {
      text: `Opened by the view of ekphrasis-spikes: ${this.file?.path ?? "?"}`,
    });
  }

  clear(): void {
    this.text = "";
  }

  override async setState(state: unknown, result: ViewStateResult): Promise<void> {
    this.report.add(NAME, `setState ${JSON.stringify(state)}`);
    await super.setState(state, result);
  }

  override setEphemeralState(state: unknown): void {
    this.report.add(
      NAME,
      `setEphemeralState ${JSON.stringify(state)} on ${this.file?.path ?? "?"}`,
    );
    super.setEphemeralState(state);
  }
}

export function registerSubpathSpike(plugin: Plugin, report: SpikeReport): void {
  plugin.registerView(VIEW_TYPE, (leaf) => new RecordingView(leaf, report));
  try {
    plugin.registerExtensions(["yaml", "yml"], VIEW_TYPE);
    report.add(NAME, "registered .yaml and .yml");
  } catch (error) {
    report.add(NAME, `registration refused, disable ekphrasis first: ${String(error)}`);
  }
}
