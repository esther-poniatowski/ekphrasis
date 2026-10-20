/**
 * Actions of an item of a sequence, moving it one position up or down and removing it, and of an
 * entry of a mapping keyed by identifiers, removing it. Each action commits a structural edit.
 */
import type { JSX } from "preact";
import type { Field } from "../../../../domain";
import { useFormContext } from "../form-context";

export function ItemActions({
  item,
  count,
  readOnly,
}: {
  readonly item: Field;
  /** Number of items of the sequence. */
  readonly count: number;
  readonly readOnly: boolean;
}): JSX.Element {
  const { edit } = useFormContext();
  const index = item.path.at(-1);
  const position = typeof index === "number" ? index : 0;
  return (
    <span class="ekphrasis-item-actions">
      <ActionButton
        label={`Move ${item.label} up`}
        symbol="↑"
        disabled={readOnly || position === 0}
        onClick={() => edit({ kind: "move-item", path: item.path, to: position - 1 })}
      />
      <ActionButton
        label={`Move ${item.label} down`}
        symbol="↓"
        disabled={readOnly || position >= count - 1}
        onClick={() => edit({ kind: "move-item", path: item.path, to: position + 1 })}
      />
      <ActionButton
        label={`Remove ${item.label}`}
        symbol="✕"
        disabled={readOnly}
        onClick={() => edit({ kind: "remove-item", path: item.path })}
      />
    </span>
  );
}

export function EntryActions({
  entry,
  readOnly,
}: {
  readonly entry: Field;
  readonly readOnly: boolean;
}): JSX.Element {
  const { edit } = useFormContext();
  return (
    <span class="ekphrasis-item-actions">
      <ActionButton
        label={`Remove ${entry.label}`}
        symbol="✕"
        disabled={readOnly}
        onClick={() => edit({ kind: "remove-entry", path: entry.path })}
      />
    </span>
  );
}

/** Action of an item or a draft: a small button holding one symbol, named for assistive tools. */
export function ActionButton({
  label,
  symbol,
  disabled = false,
  onClick,
}: {
  readonly label: string;
  readonly symbol: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      class="ekphrasis-item-action"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {symbol}
    </button>
  );
}
