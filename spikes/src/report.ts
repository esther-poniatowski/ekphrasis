/**
 * Display of a spike result: logged to the console, announced by a notice, and shown in a modal
 * whose text can be copied, so that the result can be pasted into the decision record.
 */
import { Modal, Notice, type App } from "obsidian";

/** Result of one spike run, as lines of plain text. */
export interface SpikeReport {
  readonly title: string;
  readonly lines: readonly string[];
}

class ReportModal extends Modal {
  constructor(
    app: App,
    private readonly report: SpikeReport,
  ) {
    super(app);
  }

  override onOpen(): void {
    const text = formatReport(this.report);
    this.titleEl.setText(this.report.title);
    this.contentEl.createEl("pre", { text, attr: { style: "white-space: pre-wrap" } });
    const button = this.contentEl.createEl("button", { text: "Copy" });
    button.addEventListener("click", () => {
      void navigator.clipboard.writeText(text).then(() => new Notice("Report copied."));
    });
  }

  override onClose(): void {
    this.contentEl.empty();
  }
}

/** Formats a report as Markdown-friendly plain text. */
export function formatReport(report: SpikeReport): string {
  return [`# ${report.title}`, "", ...report.lines].join("\n");
}

/** Publishes a report through the console, a notice and a modal. */
export function showReport(app: App, report: SpikeReport): void {
  console.info(`[ekphrasis-spikes]\n${formatReport(report)}`);
  new Notice(`Spike finished: ${report.title}`);
  new ReportModal(app, report).open();
}

/** Formats an unknown thrown value as one line. */
export const describeError = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

/** Formats a duration in milliseconds. */
export const ms = (duration: number): string => `${duration.toFixed(1)} ms`;
