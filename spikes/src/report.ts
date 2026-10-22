/**
 * Report of the spikes: each observation is written to the developer console with the prefix
 * `ekphrasis-spike:`, shown in a notice, and kept, so that the command *Copy the report* copies
 * every observation of the session at once.
 */
import { Notice } from "obsidian";

export class SpikeReport {
  private readonly lines: string[] = [];

  /** Records `line` under the name of its spike. */
  add(spike: string, line: string): void {
    const entry = `[${spike}] ${line}`;
    this.lines.push(entry);
    console.log(`ekphrasis-spike: ${entry}`);
    new Notice(`Spike: ${entry}`, 8000);
  }

  /** Copies every observation recorded since the plugin loaded, one per line. */
  async copy(): Promise<void> {
    await navigator.clipboard.writeText(this.lines.join("\n"));
    new Notice(`Spike: ${this.lines.length} observations copied.`);
  }
}
