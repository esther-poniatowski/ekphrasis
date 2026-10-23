/**
 * Suggestions of field paths after the hash sign of a Markdown link to a YAML file, as in
 * `[aim](questions/intermittency.yml#`, as Obsidian suggests the headings of a note.
 *
 * The path of the link resolves from the note being edited, as Obsidian resolves it. The fields
 * proposed are those of the form of the target instance, built from its text and its schema. A
 * wikilink receives no suggestion, since the suggestion of headings of Obsidian takes over there.
 */
import {
  EditorSuggest,
  type App,
  type Editor,
  type EditorPosition,
  type EditorSuggestContext,
  type EditorSuggestTriggerInfo,
  type TFile,
} from "obsidian";
import type { FormService } from "../../application";
import {
  destinationText,
  fieldPathCompletions,
  subpathQueryAt,
  type FieldPathCompletion,
  type FormModel,
  type SubpathQuery,
} from "../../domain";

/** Highest number of field paths listed at once. */
const SUGGESTION_LIMIT = 100;

/** Form model of one version of a file, kept between key presses. */
interface CachedModel {
  readonly path: string;
  readonly mtime: number;
  readonly model: FormModel | null;
}

export class FieldPathSuggest extends EditorSuggest<FieldPathCompletion> {
  private cached: CachedModel | null = null;

  constructor(
    app: App,
    private readonly forms: FormService,
  ) {
    super(app);
    this.limit = SUGGESTION_LIMIT;
  }

  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    file: TFile | null,
  ): EditorSuggestTriggerInfo | null {
    if (file === null) return null;
    const subpath = queryBefore(editor, cursor);
    if (subpath === null || this.targetOf(subpath, file) === null) return null;
    return { start: { line: cursor.line, ch: subpath.start }, end: cursor, query: subpath.query };
  }

  async getSuggestions(context: EditorSuggestContext): Promise<FieldPathCompletion[]> {
    const subpath = queryBefore(context.editor, context.end);
    const target = subpath === null ? null : this.targetOf(subpath, context.file);
    if (target === null) return [];
    const model = await this.modelOf(target);
    return model === null ? [] : fieldPathCompletions(model, context.query);
  }

  renderSuggestion(value: FieldPathCompletion, el: HTMLElement): void {
    const content = el.createDiv({ cls: "suggestion-content" });
    content.createDiv({ cls: "suggestion-title", text: value.id });
    content.createDiv({ cls: "suggestion-note", text: value.trail.join(" › ") });
  }

  selectSuggestion(value: FieldPathCompletion): void {
    const context = this.context;
    if (context === null) return;
    const angled = queryBefore(context.editor, context.end)?.angled ?? false;
    context.editor.replaceRange(destinationText(value.id, angled), context.start, context.end);
  }

  /** File reached by the link of `subpath` from the note `source`, when it is a YAML file. */
  private targetOf(subpath: SubpathQuery, source: TFile): TFile | null {
    return this.app.metadataCache.getFirstLinkpathDest(subpath.linkpath, source.path);
  }

  /** Form model of `file`, or `null` when the file has no form. */
  private async modelOf(file: TFile): Promise<FormModel | null> {
    const cached = this.cached;
    if (cached?.path === file.path && cached.mtime === file.stat.mtime) return cached.model;
    const text = await this.app.vault.cachedRead(file);
    const state = await this.forms.open(file.path, text);
    const model = state.status === "form" ? state.model : null;
    this.cached = { path: file.path, mtime: file.stat.mtime, model };
    return model;
  }
}

/** Field path typed before `cursor` in a Markdown link to a YAML file, or `null`. */
function queryBefore(editor: Editor, cursor: EditorPosition): SubpathQuery | null {
  return subpathQueryAt(editor.getLine(cursor.line).slice(0, cursor.ch));
}
