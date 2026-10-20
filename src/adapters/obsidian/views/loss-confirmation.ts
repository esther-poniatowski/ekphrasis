/**
 * Confirmation of a switch of alternative that would remove filled values: an Obsidian modal
 * listing the fields whose values would be lost, with a button removing them and a button
 * cancelling the switch. Closing the modal by its cross or by `Escape` cancels the switch.
 *
 * The modal is built from the class `Modal` and the classes of the native dialogs, since the
 * class `ConfirmationModal` requires Obsidian 1.13, later than the minimal version of the
 * manifest.
 */
import { Modal, type App } from "obsidian";
import type { LossRequest } from "../ui/form-context";

/** Opens the confirmation of `request`, resolved to `true` when the author removes the values. */
export function confirmLoss(app: App, request: LossRequest): Promise<boolean> {
  return new Promise((resolve) => new LossModal(app, request, resolve).open());
}

class LossModal extends Modal {
  private confirmed = false;

  constructor(
    app: App,
    private readonly request: LossRequest,
    private readonly resolve: (confirmed: boolean) => void,
  ) {
    super(app);
  }

  override onOpen(): void {
    const { contentEl, request } = this;
    this.titleEl.setText(`Switch to ${request.alternative}?`);
    contentEl.createEl("p", {
      text:
        request.fields.length === 1
          ? "This field of the previous alternative holds a value, which would be removed from the file:"
          : "These fields of the previous alternative hold values, which would be removed from the file:",
    });
    const list = contentEl.createEl("ul");
    for (const field of request.fields) list.createEl("li", { text: field });
    const buttons = contentEl.createDiv({ cls: "modal-button-container" });
    buttons
      .createEl("button", { text: "Remove and switch", cls: "mod-warning" })
      .addEventListener("click", () => {
        this.confirmed = true;
        this.close();
      });
    buttons.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
  }

  override onClose(): void {
    this.contentEl.empty();
    this.resolve(this.confirmed);
  }
}
