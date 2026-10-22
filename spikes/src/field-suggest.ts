/**
 * Spike on the suggestions after a hash sign: can a plugin suggest field paths after
 * `[[record.yml#` or `[text](record.yml#`, beside the suggestions of headings of Obsidian?
 *
 * The declarations of the API state that `Plugin.registerEditorSuggest` registers a suggest whose
 * `onTrigger` decides at each key press whether it applies. They state no order among the
 * suggests, nor whether the suggest of links of Obsidian yields to a plugin. The spike suggests
 * three fixed field paths, and records each trigger.
 */
import {
  EditorSuggest,
  type Editor,
  type EditorPosition,
  type EditorSuggestContext,
  type EditorSuggestTriggerInfo,
  type Plugin,
} from "obsidian";
import type { SpikeReport } from "./report";

const NAME = "suggest";
const FIELD_PATHS = ["title", "task.epistemic_aim", "rows[0].name"];

/** Link to a YAML file open before the cursor, up to a hash sign and the query after it. */
const OPEN_LINK = /(?:\[\[|\]\()([^\]()]*?)(?:\.ya?ml)?#([^\]()#]*)$/;

class FieldPathSuggest extends EditorSuggest<string> {
  constructor(
    plugin: Plugin,
    private readonly report: SpikeReport,
  ) {
    super(plugin.app);
  }

  onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
    const before = editor.getLine(cursor.line).slice(0, cursor.ch);
    const match = OPEN_LINK.exec(before);
    if (match === null) return null;
    const query = match[2] ?? "";
    this.report.add(NAME, `triggered on "${match[0]}"`);
    return { start: { line: cursor.line, ch: cursor.ch - query.length }, end: cursor, query };
  }

  getSuggestions(context: EditorSuggestContext): string[] {
    return FIELD_PATHS.filter((path) => path.includes(context.query));
  }

  renderSuggestion(path: string, el: HTMLElement): void {
    el.setText(`ekphrasis-spike: ${path}`);
  }

  selectSuggestion(path: string): void {
    const context = this.context;
    if (context === null) return;
    context.editor.replaceRange(path, context.start, context.end);
    this.report.add(NAME, `inserted "${path}"`);
  }
}

export function registerSuggestSpike(plugin: Plugin, report: SpikeReport): void {
  plugin.registerEditorSuggest(new FieldPathSuggest(plugin, report));
}
