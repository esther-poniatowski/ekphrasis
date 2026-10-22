/**
 * Entry point of the disposable spike plugin `ekphrasis-spikes`, which tests inside Obsidian the
 * premises of the milestone *Links* that the declarations of the API leave open.
 *
 * Each spike records its observations in one report. The plugin is deleted once every verdict is
 * recorded in its decision record; nothing in `src/` may import from it.
 */
import { Plugin } from "obsidian";
import { registerSuggestSpike } from "./field-suggest";
import { registerResolutionSpike } from "./link-resolution";
import { registerProtocolSpike } from "./protocol-handler";
import { SpikeReport } from "./report";
import { registerSubpathSpike } from "./subpath-view";

export default class SpikesPlugin extends Plugin {
  override onload(): void {
    const report = new SpikeReport();
    registerSubpathSpike(this, report);
    registerResolutionSpike(this, report);
    registerSuggestSpike(this, report);
    registerProtocolSpike(this, report);
    this.addCommand({
      id: "copy-report",
      name: "Copy the report",
      callback: () => void report.copy(),
    });
  }
}
