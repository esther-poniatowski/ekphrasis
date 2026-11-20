/**
 * Single-line input, for the kinds `label`, `number` and `duration`, and for any scalar value that
 * the control of its kind cannot hold. A value of kind `text` displays in an input that wraps it.
 */
import type { JSX } from "preact";
import type { ScalarKind } from "../../../../domain";
import type { ScalarControlProps } from "../control-registry";
import { placeholderOf } from "./scalar-format";
import { useTextDraft, type TextDraftBinding } from "./use-text-draft";
import { WrappingInput } from "./wrapping-input";

/** Kinds whose text follows a syntax or names an identifier, so a spell checker marks no word. */
const UNCHECKED_SPELLING: ReadonlySet<ScalarKind> = new Set([
  "label",
  "latex",
  "date",
  "duration",
  "reference",
]);

export function TextControl({ field, readOnly, onCommit }: ScalarControlProps): JSX.Element {
  const draft = useTextDraft(field, onCommit);
  const { kind } = field;
  if (kind === "text")
    return <WrappingInput field={field} readOnly={readOnly} draft={draft} spellcheck />;
  return (
    <TextInput
      field={field}
      readOnly={readOnly}
      draft={draft}
      spellcheck={!UNCHECKED_SPELLING.has(kind)}
    />
  );
}

/**
 * Input for the kind `number`. A text input with a decimal keyboard, rather than a numeric
 * input, holds a placeholder such as `open` too, so the input is never replaced by another
 * element, and loses no focus, when a commit turns a placeholder into a number.
 */
export function NumberControl({ field, readOnly, onCommit }: ScalarControlProps): JSX.Element {
  const draft = useTextDraft(field, onCommit);
  return (
    <TextInput
      field={field}
      readOnly={readOnly}
      draft={draft}
      spellcheck={false}
      inputMode="decimal"
    />
  );
}

/** Props of an editor bound to the draft `draft` of the text of its field. */
export interface EditorProps extends Pick<ScalarControlProps, "field" | "readOnly"> {
  readonly draft: TextDraftBinding;
  /** Receives the element of the editor, so its owner can focus it. */
  readonly inputRef?: (element: HTMLElement | null) => void;
}

export function TextInput({
  field,
  readOnly,
  draft,
  inputRef,
  spellcheck,
  inputMode,
  list,
}: EditorProps & {
  readonly spellcheck: boolean;
  readonly inputMode?: "decimal";
  /** Identifier of the element `datalist` whose options the input suggests. */
  readonly list?: string | undefined;
}): JSX.Element {
  return (
    <input
      ref={inputRef ?? null}
      type="text"
      class="ekphrasis-control"
      list={list}
      value={draft.text}
      placeholder={placeholderOf(field)}
      readOnly={readOnly}
      spellcheck={spellcheck}
      inputMode={inputMode}
      onFocus={draft.onFocus}
      onBlur={draft.onBlur}
      onKeyDown={draft.onKeyDown}
      onBeforeInput={draft.onBeforeInput}
      onInput={(event) => draft.onInput(event.currentTarget.value)}
    />
  );
}
