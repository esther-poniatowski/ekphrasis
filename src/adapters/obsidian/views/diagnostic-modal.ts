/**
 * Modal of the setup diagnostic: runs the checks when it opens, displays their report, and lets
 * the researcher copy the report as plain text or run the checks again.
 */
import { Modal, Notice, type App } from "obsidian";
import { h, render } from "preact";
import { reportText, type DiagnosticReport } from "../../../application";
import { DiagnosticPanel, type DiagnosticPanelState } from "../ui/diagnostic-report";

export class SetupDiagnosticModal extends Modal {
  /** Number of the current run, so that the report of a superseded run is discarded. */
  private run = 0;

  constructor(
    app: App,
    private readonly diagnose: () => Promise<DiagnosticReport>,
  ) {
    super(app);
  }

  override onOpen(): void {
    this.titleEl.setText("Ekphrasis setup diagnostic");
    this.modalEl.addClass("ekphrasis-diagnostic-modal");
    void this.runChecks();
  }

  override onClose(): void {
    this.run += 1;
    render(null, this.contentEl);
    this.contentEl.empty();
  }

  private async runChecks(): Promise<void> {
    this.run += 1;
    const run = this.run;
    this.display({ status: "running" });
    let report: DiagnosticReport;
    try {
      report = await this.diagnose();
    } catch (error) {
      console.error("ekphrasis: the setup diagnostic failed.", error);
      new Notice("Ekphrasis: the setup diagnostic failed; the developer console holds the error.");
      this.close();
      return;
    }
    if (run === this.run) this.display({ status: "ready", report });
  }

  private display(state: DiagnosticPanelState): void {
    render(
      h(DiagnosticPanel, {
        state,
        onRunAgain: () => void this.runChecks(),
        onCopy: () => {
          if (state.status !== "ready") return;
          navigator.clipboard
            .writeText(reportText(state.report))
            .then(() => new Notice("Ekphrasis: the diagnostic report is copied."))
            .catch(() => new Notice("Ekphrasis: the report could not be copied."));
        },
      }),
      this.contentEl,
    );
  }
}
