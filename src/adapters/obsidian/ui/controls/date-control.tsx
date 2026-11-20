/**
 * Control of the kind `date`: a text input holding the value as written, followed by a button
 * opening the calendar of the platform. The text input admits any text, so a value that is no
 * calendar date, such as a partial date, stays visible and editable, and its issue displays below
 * the control. The calendar is a native date input kept out of view, opened by its method
 * `showPicker`, so the form adds no dependency and the calendar follows the platform. A date
 * chosen in the calendar enters the history of the text input, then commits at once.
 */
import type { JSX } from "preact";
import { useRef } from "preact/hooks";
import type { ScalarControlProps } from "../control-registry";
import { useFormContext } from "../form-context";
import { Icon } from "../icon";
import { TextInput } from "./text-control";
import { useTextDraft } from "./use-text-draft";

/** Text of a calendar date, which the native date input can display. */
const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function DateControl({ field, readOnly, onCommit }: ScalarControlProps): JSX.Element {
  const draft = useTextDraft(field, onCommit);
  const { paintIcon } = useFormContext();
  const picker = useRef<HTMLInputElement | null>(null);
  return (
    <div class="ekphrasis-date-control">
      <TextInput field={field} readOnly={readOnly} draft={draft} spellcheck={false} />
      {!readOnly && (
        <>
          <input
            ref={picker}
            type="date"
            class="ekphrasis-date-picker"
            tabIndex={-1}
            aria-hidden="true"
            value={CALENDAR_DATE.test(draft.text) ? draft.text : ""}
            onChange={(event) => {
              const chosen = event.currentTarget.value;
              if (chosen === "") return;
              draft.onInput(chosen);
              draft.onCommit();
            }}
          />
          <button
            type="button"
            class="clickable-icon ekphrasis-date-button"
            aria-label={`Choose ${field.label} in a calendar`}
            onClick={() => openPicker(picker.current)}
          >
            <Icon icon="calendar" paint={paintIcon} class="ekphrasis-date-icon" fallback="▦" />
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Opens the calendar of the date input `input`. A platform without `showPicker` receives a click
 * on the input instead, which opens its calendar where the platform supports it.
 */
function openPicker(input: HTMLInputElement | null): void {
  if (input === null) return;
  if (typeof input.showPicker === "function") {
    try {
      input.showPicker();
      return;
    } catch (error) {
      console.warn("ekphrasis: the calendar could not open.", error);
    }
  }
  input.click();
}
