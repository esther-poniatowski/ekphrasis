/** Obsidian interaction for an explicit completion target and its producer-selected view. */
import {
  Modal,
  Notice,
  Setting,
  type App,
  type ButtonComponent,
} from "obsidian";
import { waitForIndexedFile } from "../indexed-file";

export function openPrimaryViewTarget(
  app: App,
  generate: (target: string) => Promise<string>,
): void {
  new PrimaryViewTargetModal(app, generate).open();
}

class PrimaryViewTargetModal extends Modal {
  private target = "";
  private openButton: ButtonComponent | null = null;

  constructor(
    app: App,
    private readonly generate: (target: string) => Promise<string>,
  ) {
    super(app);
  }

  override onOpen(): void {
    this.titleEl.setText("Open primary view");
    new Setting(this.contentEl)
      .setName("Completion target")
      .setDesc(
        "Explicit target used by the configured producer to select the view",
      )
      .addText((text) => {
        text
          .setPlaceholder("question-typed")
          .onChange((value) => (this.target = value));
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") void this.openView();
        });
        text.inputEl.focus();
      })
      .addButton((button) => {
        this.openButton = button;
        button
          .setCta()
          .setButtonText("Generate and open")
          .onClick(() => void this.openView());
      });
  }

  override onClose(): void {
    this.contentEl.empty();
  }

  private async openView(): Promise<void> {
    if (this.openButton?.disabled) return;
    this.openButton?.setDisabled(true);
    try {
      const path = await this.generate(this.target);
      const file = await waitForIndexedFile(this.app.vault, path);
      this.close();
      await this.app.workspace.getLeaf(false).openFile(file);
      new Notice(`Ekphrasis: opened ${path}.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      new Notice(`Ekphrasis: the primary view could not be opened: ${detail}.`);
      this.openButton?.setDisabled(false);
    }
  }
}
