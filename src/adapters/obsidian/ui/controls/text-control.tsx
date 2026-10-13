/**
 * Single-line input, for the kinds `label`, `text`, `markdown-line`, `latex` and `number`, and
 * for any scalar value that the control of its kind cannot hold.
 */
import type { JSX } from "preact";
import type { ScalarControlProps } from "../control-registry";
import { placeholderOf } from "./scalar-format";
import { useTextDraft } from "./use-text-draft";

export function TextControl(props: ScalarControlProps): JSX.Element {
  const { kind } = props.field;
  return <TextInput {...props} spellcheck={kind !== "label" && kind !== "latex"} />;
}

/**
 * Input for the kind `number`. A text input with a decimal keyboard, rather than a numeric
 * input, holds a placeholder such as `open` too, so the input is never replaced by another
 * element, and loses no focus, when a commit turns a placeholder into a number.
 */
export function NumberControl(props: ScalarControlProps): JSX.Element {
  return <TextInput {...props} spellcheck={false} inputMode="decimal" />;
}

function TextInput({
  field,
  readOnly,
  onCommit,
  spellcheck,
  inputMode,
}: ScalarControlProps & {
  readonly spellcheck: boolean;
  readonly inputMode?: "decimal";
}): JSX.Element {
  const draft = useTextDraft(field, onCommit);
  return (
    <input
      type="text"
      class="ekphrasis-control"
      value={draft.text}
      placeholder={placeholderOf(field)}
      readOnly={readOnly}
      spellcheck={spellcheck}
      inputMode={inputMode}
      onFocus={draft.onFocus}
      onBlur={draft.onBlur}
      onInput={(event) => draft.onInput(event.currentTarget.value)}
    />
  );
}
