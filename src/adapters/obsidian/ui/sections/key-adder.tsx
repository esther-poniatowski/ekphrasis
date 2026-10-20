/**
 * Way to add an entry to a mapping keyed by identifiers: an input for the identifier of the new
 * entry, and a button that displays the entry as a draft. The identifier must be new and not
 * empty; the schema checks its form once the entry is written.
 */
import type { JSX } from "preact";
import { useState } from "preact/hooks";

export function KeyAdder({
  keys,
  disabled,
  onAdd,
}: {
  /** Identifiers of the entries already present. */
  readonly keys: readonly string[];
  readonly disabled: boolean;
  readonly onAdd: (key: string) => void;
}): JSX.Element {
  const [text, setText] = useState("");
  const key = text.trim();
  const problem =
    key === "" ? null : keys.includes(key) ? `The identifier ${key} is already present.` : null;
  const add = (): void => {
    if (key === "" || problem !== null) return;
    onAdd(key);
    setText("");
  };
  return (
    <div class="ekphrasis-key-adder">
      <input
        type="text"
        class="ekphrasis-control"
        placeholder="Identifier of a new entry"
        aria-label="Identifier of a new entry"
        value={text}
        disabled={disabled}
        spellcheck={false}
        onInput={(event) => setText(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") add();
        }}
      />
      <button
        type="button"
        class="ekphrasis-add"
        disabled={disabled || key === "" || problem !== null}
        onClick={add}
      >
        + Add an entry
      </button>
      {problem !== null && <div class="ekphrasis-commit-error">{problem}</div>}
    </div>
  );
}
