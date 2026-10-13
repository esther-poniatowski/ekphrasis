/**
 * Hook binding a text control to its draft: the control commits its text when it loses the
 * focus, when typing pauses for the commit delay of the settings, and when it is removed.
 */
import { useEffect, useReducer, useRef, useState } from "preact/hooks";
import { valueFromText, type ScalarField, type ScalarValue } from "../../../../domain";
import { useFormContext } from "../form-context";
import { TextDraft } from "./text-draft";

/** Handlers and text of a control bound to its draft. */
export interface TextDraftBinding {
  readonly text: string;
  readonly onFocus: () => void;
  readonly onBlur: () => void;
  /** Records the text typed, and commits it once typing pauses for the commit delay. */
  readonly onInput: (text: string) => void;
}

export function useTextDraft(
  field: ScalarField,
  onCommit: (value: ScalarValue) => void,
): TextDraftBinding {
  const { commitDelay } = useFormContext();
  const [draft] = useState(
    () => new TextDraft(field.value, (text) => valueFromText(field.kind, text)),
  );
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const timer = useRef<number | undefined>(undefined);
  const commit = useRef(onCommit);
  commit.current = onCommit;

  draft.update(field.value);

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
  };
}
