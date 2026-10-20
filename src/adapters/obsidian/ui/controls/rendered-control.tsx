/**
 * Control of the kinds `markdown-line`, `markdown` and `latex`: the value displays rendered as in
 * a note, and a click on it, or the focus reached by the keyboard, opens its editor on the text of
 * the value. Leaving the editor commits the text and renders the value again.
 *
 * An empty value displays its editor at once, with its placeholder. A read-only value displays
 * rendered, and no click opens its editor. A click on a link of the rendered value follows the
 * link, rather than opening the editor.
 */
import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { ScalarControlProps } from "../control-registry";
import { RenderedValue } from "../rendering/rendered-value";
import { isRenderedKind } from "../rendering/value-renderer";
import { TextInput } from "./text-control";
import { TextArea } from "./text-area";
import { useTextDraft } from "./use-text-draft";

export function RenderedControl({ field, readOnly, onCommit }: ScalarControlProps): JSX.Element {
  const draft = useTextDraft(field, onCommit);
  const [editing, setEditing] = useState(false);
  const editor = useRef<HTMLElement | null>(null);
  const bindEditor = (element: HTMLElement | null): void => {
    editor.current = element;
  };
  const opened = useRef(false);
  useEffect(() => {
    // Only an editor opened from the rendered value takes the focus.
    if (editing && opened.current) editor.current?.focus();
    opened.current = false;
  }, [editing]);

  const kind = field.kind;
  if (!isRenderedKind(kind)) return <TextInput field={field} readOnly draft={draft} spellcheck />;
  if (!editing && draft.text.trim() !== "") {
    return (
      <RenderedValue
        kind={kind}
        text={draft.text}
        class="ekphrasis-control"
        tabIndex={0}
        role={readOnly ? undefined : "button"}
        aria-label={readOnly ? undefined : `Edit ${field.label}`}
        aria-readonly={readOnly}
        onMouseDown={(event) => {
          // A link keeps the focus away, so its click follows the link.
          if ((event.target as Element | null)?.closest("a") != null) event.preventDefault();
        }}
        onFocus={() => {
          if (readOnly) return;
          opened.current = true;
          setEditing(true);
        }}
      />
    );
  }
  const binding = {
    ...draft,
    onFocus: () => {
      setEditing(true);
      draft.onFocus();
    },
    onBlur: () => {
      draft.onBlur();
      setEditing(false);
    },
  };
  return kind === "markdown" ? (
    <TextArea field={field} readOnly={readOnly} draft={binding} inputRef={bindEditor} />
  ) : (
    <TextInput
      field={field}
      readOnly={readOnly}
      draft={binding}
      inputRef={bindEditor}
      spellcheck={kind === "markdown-line"}
    />
  );
}
