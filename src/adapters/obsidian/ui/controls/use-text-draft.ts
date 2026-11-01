/**
 * Hook binding a text control to its draft: the control commits its text when it loses the
 * focus, when typing pauses for the commit delay of the settings, when it is removed, and at the
 * request of the control, as the key `Enter` of a single-line value requests it.
 *
 * The keys of undo and redo, and the items *Undo* and *Redo* of the menu *Edit* of Obsidian, move
 * through the history of the draft and commit the restored text at once. The history of the
 * draft replaces the history of the browser, which a control loses whenever its value is set by
 * the control itself, as when a pasted line break becomes a space.
 */
import { useEffect, useReducer, useRef, useState } from "preact/hooks";
import { valueFromText, type ScalarField, type ScalarValue } from "../../../../domain";
import { useFormContext } from "../form-context";
import { displayedValue } from "./scalar-format";
import { TextDraft } from "./text-draft";

/** Handlers and text of a control bound to its draft. */
export interface TextDraftBinding {
  readonly text: string;
  readonly onFocus: () => void;
  readonly onBlur: () => void;
  /** Records the text typed, and commits it once typing pauses for the commit delay. */
  readonly onInput: (text: string) => void;
  /** Commits at once the text typed since the last commit, if any. */
  readonly onCommit: () => void;
  /** Undoes or redoes at the keys `Mod+Z` and `Mod+Shift+Z`, or `Ctrl+Y`. */
  readonly onKeyDown: (event: KeyboardEvent) => void;
  /** Undoes or redoes at the request of the menu *Edit*, which reaches the control as an input. */
  readonly onBeforeInput: (event: Event) => void;
}

type HistoryStep = "undo" | "redo";

/** Step of history requested by the key press `event`, or `null` for another key. */
export function historyStepOfKey(event: KeyboardEvent): HistoryStep | null {
  if (event.isComposing || event.altKey || !(event.metaKey || event.ctrlKey)) return null;
  const key = event.key.toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  return key === "y" && event.ctrlKey && !event.shiftKey ? "redo" : null;
}

function historyStepOfInput(event: Event): HistoryStep | null {
  const type = (event as InputEvent).inputType;
  return type === "historyUndo" ? "undo" : type === "historyRedo" ? "redo" : null;
}

export function useTextDraft(
  field: ScalarField,
  onCommit: (value: ScalarValue) => void,
): TextDraftBinding {
  const { commitDelay } = useFormContext();
  // The draft follows the displayed value, so an unfilled value displays as an empty control.
  const [draft] = useState(
    () => new TextDraft(displayedValue(field), (text) => valueFromText(field.kind, text)),
  );
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const timer = useRef<number | undefined>(undefined);
  const commit = useRef(onCommit);
  commit.current = onCommit;

  draft.update(displayedValue(field));

  const flush = (): void => {
    window.clearTimeout(timer.current);
    const taken = draft.take();
    if (taken !== null) commit.current(taken.value);
  };

  // A control removed with an uncommitted edit, as when the form is closed, commits it first.
  useEffect(() => flush, []);

  const move = (event: Event, step: HistoryStep | null): void => {
    if (step === null) return;
    // The browser would apply its own history, which the draft replaces.
    event.preventDefault();
    if (!(step === "undo" ? draft.undo() : draft.redo())) return;
    flush();
    rerender(0);
  };

  return {
    text: draft.displayed,
    onFocus: () => draft.focus(),
    onBlur: () => {
      flush();
      draft.blur();
      rerender(0);
    },
    onInput: (text) => {
      window.clearTimeout(timer.current);
      draft.input(text);
      rerender(0);
      timer.current = window.setTimeout(flush, commitDelay);
    },
    onCommit: flush,
    onKeyDown: (event) => move(event, historyStepOfKey(event)),
    onBeforeInput: (event) => move(event, historyStepOfInput(event)),
  };
}
