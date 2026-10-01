/**
 * View of an instance: hosts the form view and the source view of one YAML file, and switches
 * between them.
 *
 * The view extends `TextFileView`, which holds the text of the file in `data` and writes it back
 * on `requestSave`. Each load of the text, including a reload after a change made outside, runs
 * the form pipeline again. A file bound to no schema opens in the source view, since every form
 * derives from a schema; a mode chosen by the author holds until another file opens.
 */
import { Notice, setIcon, TextFileView, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import { h, render } from "preact";
import type { FormService, FormState } from "../../../application";
import { ICONS, INSTANCE_VIEW_TYPE, isYamlExtension } from "../constants";
import type { ControlRegistry } from "../ui/control-registry";
import { FormPanel } from "../ui/form-panel";
import { SourceEditor } from "./source-editor";

export type ViewMode = "form" | "source";

/** Collaborators of the view, supplied by the plugin. */
export interface InstanceViewServices {
  readonly forms: FormService;
  readonly registry: ControlRegistry;
}

/**
 * Whether the form accepts edits. Commits are implemented in the milestone *Saving of scalars*,
 * so the form stays read-only until then.
 */
const FORM_EDITABLE = false;

const isViewMode = (value: unknown): value is ViewMode => value === "form" || value === "source";

export class InstanceView extends TextFileView {
  private formState: FormState | null = null;
  /** Mode chosen by the author for the open file, or `null` to follow the binding. */
  private chosenMode: ViewMode | null = null;
  /** Mode restored from the workspace, applied when its file loads. */
  private restoredMode: ViewMode | null = null;
  /** Counter of pipeline runs, so the result of a superseded run is discarded. */
  private generation = 0;
  private editor: SourceEditor | null = null;
  private readonly formEl: HTMLElement;
  private readonly sourceEl: HTMLElement;
  private readonly modeAction: HTMLElement;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly services: InstanceViewServices,
  ) {
    super(leaf);
    this.contentEl.addClass("ekphrasis-view");
    this.formEl = this.contentEl.createDiv({ cls: "ekphrasis-form-container" });
    this.sourceEl = this.contentEl.createDiv({ cls: "ekphrasis-source-container" });
    this.modeAction = this.addAction(ICONS.sourceView, "Open the source view", () =>
      this.toggleMode(),
    );
  }

  getViewType(): string {
    return INSTANCE_VIEW_TYPE;
  }

  override getIcon(): string {
    return ICONS.instance;
  }

  override canAcceptExtension(extension: string): boolean {
    return isYamlExtension(extension);
  }

  /** Mode displayed: the chosen one, else the source view for an unbound file, else the form. */
  get mode(): ViewMode {
    return this.chosenMode ?? (this.formState?.status === "unbound" ? "source" : "form");
  }

  getViewData(): string {
    return this.data;
  }

  setViewData(data: string, clear: boolean): void {
    this.data = data;
    if (clear) {
      this.chosenMode = this.restoredMode;
      this.restoredMode = null;
      this.formState = null;
      // Displays the loading message, or the restored source view, while the pipeline runs.
      this.display();
    }
    this.editor?.setText(data, clear);
    void this.refresh();
  }

  clear(): void {
    this.data = "";
    this.formState = null;
    this.editor?.setText("", true);
  }

  /** Switches between the form view and the source view. */
  toggleMode(): void {
    this.chosenMode = this.mode === "form" ? "source" : "form";
    this.app.workspace.requestSaveLayout();
    // The text may have changed in the source view, so the form is rebuilt from it.
    if (this.chosenMode === "form") void this.refresh();
    else this.display();
  }

  /** Whether the displayed form was built from the schema file at `path`. */
  dependsOn(path: string): boolean {
    const state = this.formState;
    return state !== null && "schemaPaths" in state && state.schemaPaths.includes(path);
  }

  /** Runs the form pipeline on the current text, and displays its outcome. */
  async refresh(): Promise<void> {
    const file = this.file;
    if (file === null) return;
    const generation = ++this.generation;
    let state: FormState | null;
    try {
      state = await this.services.forms.open(file.path, this.data);
    } catch (error) {
      console.error("ekphrasis: the form could not be built.", error);
      new Notice("Ekphrasis: the form could not be built; the developer console holds the error.");
      state = null;
      this.chosenMode = "source";
    }
    if (generation !== this.generation) return;
    this.formState = state;
    this.display();
  }

  override getState(): Record<string, unknown> {
    return { ...super.getState(), mode: this.chosenMode };
  }

  override async setState(state: unknown, result: ViewStateResult): Promise<void> {
    if (typeof state === "object" && state !== null) {
      const mode = (state as Record<string, unknown>)["mode"];
      if (isViewMode(mode)) this.restoredMode = mode;
    }
    await super.setState(state, result);
  }

  protected override async onClose(): Promise<void> {
    render(null, this.formEl);
    this.editor?.destroy();
    this.editor = null;
    await super.onClose();
  }

  private display(): void {
    const mode = this.mode;
    this.formEl.toggle(mode === "form");
    this.sourceEl.toggle(mode === "source");
    setIcon(this.modeAction, mode === "form" ? ICONS.sourceView : ICONS.formView);
    this.modeAction.setAttr(
      "aria-label",
      mode === "form" ? "Open the source view" : "Open the form view",
    );
    if (mode === "form") {
      render(
        h(FormPanel, {
          state: this.formState,
          registry: this.services.registry,
          readOnly: !FORM_EDITABLE,
          onOpenSource: () => {
            if (this.mode === "form") this.toggleMode();
          },
        }),
        this.formEl,
      );
    } else {
      this.showEditor();
    }
  }

  private showEditor(): void {
    if (this.editor === null) {
      this.editor = new SourceEditor(this.sourceEl, this.data, (text) => {
        this.data = text;
        this.requestSave();
      });
    }
    this.editor.focus();
  }
}
