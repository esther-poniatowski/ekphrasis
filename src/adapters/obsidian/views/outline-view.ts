/**
 * Outline view: a side panel displaying the outline of the form of the active instance, as the
 * feature note on the outline specifies. The panel follows the source of the outline channel,
 * and displays its form again at each change reported by the channel.
 */
import { ItemView, setIcon, type WorkspaceLeaf } from "obsidian";
import { h, render } from "preact";
import { ICONS, OUTLINE_VIEW_TYPE } from "../constants";
import { OutlinePanel } from "../ui/outline/outline-panel";
import type { OutlineChannel } from "./outline-channel";

export class OutlineView extends ItemView {
  private unsubscribe: (() => void) | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly channel: OutlineChannel,
  ) {
    super(leaf);
    this.contentEl.addClass("ekphrasis-outline-view");
  }

  getViewType(): string {
    return OUTLINE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Form outline";
  }

  override getIcon(): string {
    return ICONS.outline;
  }

  /** Moves the focus to the search of the fields. */
  focusSearch(): void {
    this.contentEl.querySelector<HTMLInputElement>(".ekphrasis-outline-search")?.focus();
  }

  protected override async onOpen(): Promise<void> {
    this.unsubscribe = this.channel.subscribe(() => this.display());
    this.display();
    await super.onOpen();
  }

  protected override async onClose(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    render(null, this.contentEl);
    await super.onClose();
  }

  private display(): void {
    const source = this.channel.source;
    render(
      h(OutlinePanel, {
        // The state of the panel belongs to one file, so another file opens a new panel.
        key: source?.filePath ?? "",
        form: source?.form ?? null,
        focusedId: source?.focusedId ?? null,
        onReveal: (path, showHelp) => source?.reveal(path, showHelp),
        paintIcon: setIcon,
      }),
      this.contentEl,
    );
  }
}
