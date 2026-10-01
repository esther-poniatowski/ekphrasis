/**
 * Label of a field, with the markers of a required field and of a locked value, and the note
 * that explains a lock.
 *
 * The explanation of a lock is revealed by a click on its badge rather than by a tooltip: no
 * hover exists on touch devices, and no tooltip mechanism displayed on the badge inside Obsidian.
 */
import type { JSX } from "preact";
import { useId, useState } from "preact/hooks";
import type { Field, FieldLock } from "../../../domain";

const LOCK_NOTES: Readonly<Record<FieldLock, string>> = {
  alias: "This value comes from an anchor elsewhere in the file; edit it at its anchor.",
  merge: "This value is merged from another mapping by a merge key; edit it in that mapping.",
};

/** Whether the note of a lock is shown, shared by the badge and the note it reveals. */
export interface LockDisclosure {
  readonly shown: boolean;
  readonly toggle: () => void;
  readonly noteId: string;
}

export function useLockDisclosure(): LockDisclosure {
  const [shown, setShown] = useState(false);
  const noteId = useId();
  return { shown, toggle: () => setShown((current) => !current), noteId };
}

export function FieldLabel({
  field,
  disclosure,
}: {
  readonly field: Field;
  readonly disclosure: LockDisclosure;
}): JSX.Element {
  return (
    <div class="ekphrasis-field-label">
      <span>{field.label}</span>
      {field.required && (
        <span class="ekphrasis-required" aria-label="required">
          *
        </span>
      )}
      {field.lock !== null && (
        <button
          type="button"
          class="ekphrasis-lock"
          aria-label="Why is this value read-only?"
          aria-expanded={disclosure.shown}
          aria-controls={disclosure.noteId}
          onClick={disclosure.toggle}
        >
          <HelpIcon />
        </button>
      )}
    </div>
  );
}

/**
 * Circled question mark of the Lucide icon set, which Obsidian uses. The icon is inlined rather
 * than drawn by `setIcon` of Obsidian, so the components load without Obsidian in unit tests.
 */
function HelpIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

/** Explanation of the lock of `field`, displayed while its badge is toggled on. */
export function LockNote({
  field,
  disclosure,
}: {
  readonly field: Field;
  readonly disclosure: LockDisclosure;
}): JSX.Element | null {
  if (field.lock === null || !disclosure.shown) return null;
  return (
    <div id={disclosure.noteId} class="ekphrasis-lock-note">
      {LOCK_NOTES[field.lock]}
    </div>
  );
}
