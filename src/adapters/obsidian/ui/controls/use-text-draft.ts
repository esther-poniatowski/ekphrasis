/**
 * Hook binding a text control to its draft: the control commits its text when it loses the
 * focus, when typing pauses for the commit delay of the settings, when it is removed, and at the
 * request of the control, as the key `Enter` of a single-line value requests it.
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
  };
}
