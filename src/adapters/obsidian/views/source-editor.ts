/**
 * Source view: a CodeMirror 6 editor of the YAML text of an instance.
 *
 * The YAML language mode is bundled with the plugin, whereas the core packages of CodeMirror
 * are supplied by Obsidian at run time (see the externals of the esbuild configuration), so the
 * editor shares the state and view classes of the host. Syntax tokens receive the classes of
 * `classHighlighter`, which the style sheet colours with the code variables of the theme.
 */
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { yaml } from "@codemirror/lang-yaml";
import { indentUnit, syntaxHighlighting } from "@codemirror/language";
import { Annotation, EditorState, type Extension } from "@codemirror/state";
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { classHighlighter } from "@lezer/highlight";

/** Marks the transactions that load a text from the file, which must not be reported back. */
const fromFile = Annotation.define<boolean>();

export class SourceEditor {
  private readonly view: EditorView;

  /**
   * @param onChange Called with the whole text after each change made by the author; changes
   *   loaded from the file through {@link setText} are not reported.
   */
  constructor(
    parent: HTMLElement,
    text: string,
    private readonly onChange: (text: string) => void,
  ) {
    this.view = new EditorView({ parent, state: this.createState(text) });
  }

  get text(): string {
    return this.view.state.doc.toString();
  }

  /**
   * Replaces the text when it differs from the displayed one. With `reset`, the undo history
   * and the selection are discarded too, as when another file opens in the view.
   */
  setText(text: string, reset: boolean): void {
    if (reset) {
      this.view.setState(this.createState(text));
      return;
    }
    if (text === this.text) return;
    const head = Math.min(this.view.state.selection.main.head, text.length);
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: text },
      selection: { anchor: head },
      annotations: fromFile.of(true),
    });
  }

  focus(): void {
    this.view.focus();
  }

  destroy(): void {
    this.view.destroy();
  }

  private createState(text: string): EditorState {
    return EditorState.create({ doc: text, extensions: this.extensions() });
  }

  private extensions(): Extension[] {
    return [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      // YAML forbids tabs in indentation, so an indentation step is two spaces.
      indentUnit.of("  "),
      EditorState.tabSize.of(2),
      EditorView.lineWrapping,
      yaml(),
      syntaxHighlighting(classHighlighter),
      EditorView.updateListener.of((update) => {
        const authored = update.transactions.some(
          (transaction) => transaction.docChanged && !transaction.annotation(fromFile),
        );
        if (authored) this.onChange(update.state.doc.toString());
      }),
    ];
  }
}
