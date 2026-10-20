/**
 * View of an instance: hosts the form view and the source view of one YAML file, and switches
 * between them.
 *
 * The view extends `TextFileView`, which loads the text of the file through `setViewData` and
 * saves the text returned by `getViewData`. The text and the form state belong to the session of
 * the instance: each load of the text, including a reload after a change made outside, runs the
 * form pipeline again, and each commit of the form writes the file at once. The mode displayed
 * follows the rules of `ModeChoice`.
 *
 * The view is the source of the outline while it is the last active view of an instance: it
 * reports to the outline channel each change of its form and of its focused field, and moves its
 * form to the field of an entry clicked in the outline.
 */
import {
  Notice,
  setIcon,
  TextFileView,
  type TFile,
  type ViewStateResult,
  type WorkspaceLeaf,
} from "obsidian";
import { h, render } from "preact";
import {
  InstanceSession,
  type CommitService,
  type EkphrasisSettings,
  type FormReady,
  type FormService,
  type SessionHost,
} from "../../../application";
import { IssueIndex, type YamlPath } from "../../../domain";
import { ICONS, INSTANCE_VIEW_TYPE, isYamlExtension } from "../constants";
import type { ControlRegistry } from "../ui/control-registry";
import { FoldState } from "../ui/fold-state";
import { FormPanel } from "../ui/form-panel";
import { HelpState } from "../ui/help-state";
import { countPhrase } from "../ui/issue-list";
import {
  DEFAULT_QUEUE_OPTIONS,
  RenderQueue,
  windowEnvironment,
  type BatchReport,
} from "../ui/rendering/render-queue";
import { planReveal, revealElement } from "../ui/reveal";
import { ObsidianValueRenderer } from "../value-renderer";
import { confirmLoss } from "./loss-confirmation";
import type { OutlineChannel, OutlineSource } from "./outline-channel";
import { SourceEditor } from "./source-editor";
import { isViewMode, ModeChoice, type ViewMode } from "./view-mode";

/** Duration beyond which a task blocks input, as the browser counts a long task. */
const LONG_TASK_MS = 50;

/** Reports a batch of renderings that blocked input longer than a long task. */
function reportLongBatch({ jobs, durationMs, pending }: BatchReport): void {
  if (durationMs <= LONG_TASK_MS) return;
  console.warn(
    `ekphrasis: a batch of ${jobs} rendered values took ${Math.round(durationMs)} ms ` +
      `(${pending} pending).`,
  );
}

/** Collaborators of the view, supplied by the plugin. */
export interface InstanceViewServices {
  readonly forms: FormService;
  readonly commits: CommitService;
  readonly registry: ControlRegistry;
  readonly settings: () => EkphrasisSettings;
  readonly outline: OutlineChannel;
}

export class InstanceView extends TextFileView implements SessionHost, OutlineSource {
  private readonly session: InstanceSession;
  private readonly modes = new ModeChoice();
  /**
   * Counter of the files loaded, which keys the form: the controls of another file are new
   * components, so no text typed for one file is committed to the next.
   */
  private fileCount = 0;
  /** Element of the form that held the focus last, restored when the author returns. */
  private lastFocused: HTMLElement | null = null;
  private editor: SourceEditor | null = null;
  /** Printed field path of the field that holds the focus in the form, or `null`. */
  private focused: string | null = null;
  /** Folded state of the sections of the form, kept across displays of the same file. */
  private readonly folds = new FoldState(() => this.display());
  /** Shown instructions of the fields, kept across displays of the same file. */
  private readonly help = new HelpState(() => this.display());
  private readonly renderer: ObsidianValueRenderer;
  private readonly queue: RenderQueue;
  private readonly formEl: HTMLElement;
  private readonly sourceEl: HTMLElement;
  private readonly modeAction: HTMLElement;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly services: InstanceViewServices,
  ) {
    super(leaf);
    this.session = new InstanceSession(services.forms, services.commits, this);
    this.contentEl.addClass("ekphrasis-view");
    this.formEl = this.contentEl.createDiv({ cls: "ekphrasis-form-container" });
    this.sourceEl = this.contentEl.createDiv({ cls: "ekphrasis-source-container" });
    this.formEl.addEventListener("focusin", (event) => {
      const target = event.target as Node | null;
      if (!target?.instanceOf(HTMLElement)) return;
      this.lastFocused = target;
      const id = target.closest<HTMLElement>("[data-path]")?.dataset["path"] ?? null;
      if (id !== this.focused) {
        this.focused = id;
        services.outline.changed(this);
      }
    });
    this.renderer = new ObsidianValueRenderer(this.app, () => this.file?.path ?? "", this);
    this.queue = new RenderQueue(windowEnvironment(this.contentEl), {
      ...DEFAULT_QUEUE_OPTIONS,
      onBatch: reportLongBatch,
    });
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

  get filePath(): string | null {
    return this.file?.path ?? null;
  }

  /**
   * Latest form of the instance, also while the source view is displayed, since a click in the
   * outline then opens the form view; `null` when the instance has no form.
   */
  get form(): FormReady | null {
    return this.session.snapshot.form;
  }

  get focusedId(): string | null {
    return this.focused;
  }

  /** Mode displayed: the chosen one, else the source view for an unbound file, else the form. */
  get mode(): ViewMode {
    return this.modes.displayed(this.session.snapshot.state?.status === "unbound");
  }

  getViewData(): string {
    return this.session.text;
  }

  setViewData(data: string, clear: boolean): void {
    if (clear) {
      this.session.reset();
      this.fileCount += 1;
      this.lastFocused = null;
      this.folds.reset();
      this.help.reset();
      this.focused = null;
      this.modes.fileOpened();
    }
    this.session.setText(data);
    this.data = data;
    // Displays the loading message, or the restored source view, while the pipeline runs.
    if (clear) this.display();
    this.editor?.setText(data, clear);
    void this.refresh();
  }

  clear(): void {
    this.session.reset();
    this.data = "";
    this.editor?.setText("", true);
  }

  /** Writes the text produced by commits of the form to the file. */
  write(text: string): void {
    this.data = text;
    this.editor?.setText(text, false);
    void this.save();
  }

  /** Displays the new snapshot of the session. */
  changed(): void {
    this.display();
  }

  /**
   * Moves the form to the field at `path`: the form view opens, the sections containing the
   * field unfold, its instructions show when `showHelp` holds, and its control takes the focus.
   */
  reveal(path: YamlPath, showHelp: boolean): void {
    const form = this.session.snapshot.form;
    const plan = form === null ? null : planReveal(form.model, path);
    if (plan === null) return;
    if (this.mode !== "form") {
      this.modes.choose("form");
      this.app.workspace.requestSaveLayout();
    }
    this.folds.unfold(plan.unfold);
    if (showHelp) this.help.show(plan.helpKey);
    this.display();
    this.app.workspace.setActiveLeaf(this.leaf, { focus: true });
    revealElement(this.formEl, plan.id);
  }

  /** Folds every group and collection of the form when `folded` holds, and else unfolds them. */
  foldAll(folded: boolean): void {
    this.folds.setAll(folded);
  }

  /** Switches between the form view and the source view. */
  toggleMode(): void {
    const mode = this.mode === "form" ? "source" : "form";
    this.modes.choose(mode);
    this.app.workspace.requestSaveLayout();
    // The text may have changed in the source view, so the form is rebuilt from it.
    if (mode === "form") {
      void this.refresh();
    } else {
      this.display();
      // Only a switch asked by the author moves the focus. A display that follows a commit or a
      // reload must not, since another pane of the same file then holds the focus.
      this.editor?.focus();
    }
  }

  /**
   * Runs the form pipeline again, validation included, in the form view, then reports the count
   * of the issues in a notice and scrolls to the first issue displayed.
   */
  async validate(): Promise<void> {
    if (this.modes.recorded !== "form") {
      this.modes.choose("form");
      this.app.workspace.requestSaveLayout();
    }
    await this.refresh();
    const state = this.session.snapshot.state;
    if (state?.status !== "form") {
      new Notice("Ekphrasis: the instance has no form, so it was not validated.");
      return;
    }
    const issues = IssueIndex.of(state.model, state.report.issues);
    new Notice(`Ekphrasis: ${countPhrase(issues.counts)}.`);
    this.formEl.querySelector(".ekphrasis-issues")?.scrollIntoView({ block: "center" });
  }

  /** Whether the displayed form was built from the schema file at `path`. */
  dependsOn(path: string): boolean {
    const state = this.session.snapshot.state;
    return state !== null && "schemaPaths" in state && state.schemaPaths.includes(path);
  }

  /** Runs the form pipeline on the current text, and displays its outcome. */
  async refresh(): Promise<void> {
    const file = this.file;
    if (file === null) return;
    try {
      await this.session.refresh(file.path);
    } catch (error) {
      console.error("ekphrasis: the form could not be built.", error);
      new Notice("Ekphrasis: the form could not be built; the developer console holds the error.");
      this.modes.force("source");
      this.display();
    }
  }

  override getState(): Record<string, unknown> {
    return { ...super.getState(), mode: this.modes.recorded };
  }

  override async setState(state: unknown, result: ViewStateResult): Promise<void> {
    if (typeof state === "object" && state !== null) {
      const mode = (state as Record<string, unknown>)["mode"];
      if (isViewMode(mode)) this.modes.restore(mode);
    }
    await super.setState(state, result);
  }

  /**
   * Removes the form before the file is saved and released: a control removed with text not yet
   * committed commits it, so the text reaches this file rather than the next one.
   */
  protected override async onOpen(): Promise<void> {
    await super.onOpen();
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        if (leaf === this.leaf) this.services.outline.activate(this);
        this.restoreFocus(leaf);
      }),
    );
    // The first view of an instance feeds the outline until another one becomes active.
    if (this.services.outline.source === null) this.services.outline.activate(this);
  }

  /**
   * Returns the focus to the field that held it last, when the author comes back to this view.
   * The check runs after the click that activated the view, so a field focused by that click
   * keeps the focus.
   */
  private restoreFocus(leaf: WorkspaceLeaf | null): void {
    if (leaf !== this.leaf || this.mode !== "form") return;
    window.setTimeout(() => {
      const target = this.lastFocused;
      const active = this.contentEl.ownerDocument.activeElement;
      if (target?.isConnected && !this.contentEl.contains(active)) {
        target.focus({ preventScroll: true });
      }
    }, 0);
  }

  override async onUnloadFile(file: TFile): Promise<void> {
    render(null, this.formEl);
    await super.onUnloadFile(file);
  }

  protected override async onClose(): Promise<void> {
    render(null, this.formEl);
    this.queue.dispose();
    this.services.outline.release(this);
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
      const fileCount = this.fileCount;
      render(
        h(FormPanel, {
          key: fileCount,
          snapshot: this.session.snapshot,
          registry: this.services.registry,
          // A commit from a control of a previous file is dropped rather than applied here.
          commit: (commit) => {
            if (fileCount === this.fileCount) this.session.commit(commit);
          },
          commitAll: (commits) => {
            if (fileCount !== this.fileCount) return false;
            const outcome = this.session.commitAll(commits);
            return outcome === "written" || outcome === "unchanged";
          },
          confirmLoss: (request) => confirmLoss(this.app, request),
          commitDelay: this.services.settings().commitDelay,
          folds: this.folds,
          help: this.help,
          renderer: this.renderer,
          scheduler: this.queue,
          reveal: (path) => this.reveal(path, false),
          onOpenSource: () => {
            if (this.mode === "form") this.toggleMode();
          },
        }),
        this.formEl,
      );
    } else {
      this.showEditor();
    }
    this.services.outline.changed(this);
  }

  private showEditor(): void {
    if (this.editor === null) {
      this.editor = new SourceEditor(this.sourceEl, this.session.text, (text) => {
        this.session.setText(text);
        this.data = text;
        this.requestSave();
      });
    }
  }
}
