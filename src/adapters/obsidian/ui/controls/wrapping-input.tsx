/**
 * Input of a single-line value that wraps a long value onto several lines, for the kind `text`
 * and the editors of the kinds `markdown-line` and `latex`: a text area of one row, which grows
 * to show the whole value, so the end of the value stays editable.
 *
 * The value stays on one line in the file. The key `Enter` commits the value instead of inserting
 * a line break, and each line break that reaches the input, by a paste or a drop, becomes a space.
 */
import type { JSX } from "preact";
import { useEffect, useLayoutEffect, useRef } from "preact/hooks";
import { placeholderOf } from "./scalar-format";
import type { EditorProps } from "./text-control";

/** Text of `text` with each line break replaced by a space, a pair `\r\n` counting as one. */
export function withoutLineBreaks(text: string): string {
  return text.replace(/\r\n?|\n/g, " ");
}

export function WrappingInput({
  field,
  readOnly,
  draft,
  inputRef,
  spellcheck,
}: EditorProps & { readonly spellcheck: boolean }): JSX.Element {
  const element = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => fitHeight(element.current), [draft.text]);
  useEffect(() => {
    const area = element.current;
    if (area === null || typeof ResizeObserver === "undefined") return;
    // A change of width moves the line breaks of the wrapped value, so the height is fitted again.
    let width = area.clientWidth;
    const observer = new ResizeObserver(() => {
      if (area.clientWidth === width) return;
      width = area.clientWidth;
      fitHeight(area);
    });
    observer.observe(area);
    return () => observer.disconnect();
  }, []);
  return (
    <textarea
      ref={(area: HTMLTextAreaElement | null) => {
        element.current = area;
        inputRef?.(area);
      }}
      class="ekphrasis-control ekphrasis-wrapping"
      rows={1}
      value={draft.text}
      placeholder={placeholderOf(field)}
      readOnly={readOnly}
      spellcheck={spellcheck}
      onFocus={draft.onFocus}
      onBlur={draft.onBlur}
      onKeyDown={(event) => {
        // A key pressed while an input method composes a character belongs to that composition.
        if (event.key !== "Enter" || event.isComposing) return;
        event.preventDefault();
        draft.onCommit();
      }}
      onInput={(event) => draft.onInput(singleLine(event.currentTarget))}
    />
  );
}

/**
 * Text of `area` on one line: each line break of its value becomes a space, and the caret keeps
 * its place after the text before it.
 */
function singleLine(area: HTMLTextAreaElement): string {
  const text = withoutLineBreaks(area.value);
  if (text === area.value) return text;
  const caret = withoutLineBreaks(area.value.slice(0, area.selectionStart)).length;
  area.value = text;
  area.setSelectionRange(caret, caret);
  return text;
}

/**
 * Fits the height of `area` to its wrapped text, borders included. A hidden area measures no
 * height, so it keeps its height from the style sheet until its next change of width.
 */
function fitHeight(area: HTMLTextAreaElement | null): void {
  if (area === null) return;
  area.style.height = "";
  if (area.scrollHeight === 0) return;
  const borders = area.offsetHeight - area.clientHeight;
  area.style.height = `${area.scrollHeight + borders}px`;
}
