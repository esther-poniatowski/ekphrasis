/**
 * Instructions of a field on demand: a help button at the right of its label, and the panel below
 * the label holding the instructions of the keyword `description`, rendered as Markdown, the
 * descriptions of the admitted values of a choice, and the values of the keyword `examples`. The
 * panel shows and hides at each click of the button, or at each press of `Enter` or `Space` on the
 * focused button, rather than at hover, since touch devices have no hover.
 */
import type { JSX } from "preact";
import type { ChoiceOption, Field, JsonValue } from "../../../domain";
import { formatScalar, optionLabel } from "./controls/scalar-format";
import { useFormContext } from "./form-context";
import { RenderedValue } from "./rendering/rendered-value";

/** Instructions and examples of one field, or of one column of a table. */
export interface Guidance {
  readonly description: string | null;
  /** Admitted values of a choice that carry a description, in the order of the schema. */
  readonly options: readonly ChoiceOption[];
  readonly examples: readonly JsonValue[];
}

/**
 * Guidance of `field`: its instructions, its examples, and the described options of a field of
 * kind `choice`, or of the items of a field of kind `choices`.
 */
export function guidanceOf(field: Field): Guidance {
  const next = "next" in field ? field.next : null;
  const options =
    "options" in field ? field.options : next !== null && "options" in next ? next.options : [];
  return {
    description: field.description,
    options: options.filter((option) => option.description !== null),
    examples: field.examples,
  };
}

export const hasGuidance = (guidance: Guidance): boolean =>
  guidance.description !== null || guidance.options.length > 0 || guidance.examples.length > 0;

/** Button showing and hiding the instructions of the help key `helpKey`, named after `label`. */
export function HelpButton({
  helpKey,
  label,
}: {
  readonly helpKey: string;
  readonly label: string;
}): JSX.Element {
  const { help } = useFormContext();
  const shown = help.isShown(helpKey);
  return (
    <button
      type="button"
      class="ekphrasis-help-button"
      aria-label={shown ? `Hide the instructions of ${label}` : `Show the instructions of ${label}`}
      aria-expanded={shown}
      data-shown={shown ? true : undefined}
      onClick={() => help.toggle(helpKey)}
      onKeyDown={(event) => {
        if (!isActivationKey(event)) return;
        // The default action would activate the button a second time, by a click.
        event.preventDefault();
        if (!event.repeat) help.toggle(helpKey);
      }}
    >
      <InfoIcon />
    </button>
  );
}

/**
 * Whether `event` presses `Enter` or `Space` without a modifier. The help button toggles its
 * instructions at the key press itself, rather than relying on the activation of a button by the
 * host, so the keyboard behaves alike in every host and in component tests.
 */
function isActivationKey(event: KeyboardEvent): boolean {
  const modified = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
  return !modified && (event.key === "Enter" || event.key === " ");
}

/** Panel of the instructions and the examples of `guidance`, while its help key is shown. */
export function FieldHelp({
  helpKey,
  guidance,
  title = null,
}: {
  readonly helpKey: string;
  readonly guidance: Guidance;
  /** Name of the field, written at the top of a panel displayed away from its label. */
  readonly title?: string | null;
}): JSX.Element | null {
  const { help } = useFormContext();
  if (!help.isShown(helpKey) || !hasGuidance(guidance)) return null;
  const { description, options, examples } = guidance;
  return (
    <div class="ekphrasis-help" data-help={helpKey}>
      {title !== null && <div class="ekphrasis-help-title">{title}</div>}
      {description !== null && (
        <RenderedValue kind="markdown" text={description} immediate class="ekphrasis-help-text" />
      )}
      {options.length > 0 && (
        <div class="ekphrasis-help-options">
          <span class="ekphrasis-help-label">Options</span>
          <ul>
            {options.map((option, index) => (
              <li key={index}>
                <span class="ekphrasis-help-option">{optionLabel(option)}</span>
                {`: ${option.description ?? ""}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      {examples.length > 0 && (
        <div class="ekphrasis-help-examples">
          <span class="ekphrasis-help-label">{examples.length === 1 ? "Example" : "Examples"}</span>
          <ul>
            {examples.map((example, index) => (
              <li key={index}>
                <code>{formatScalar(example)}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Circled letter i of the Lucide icon set, distinct from the circled question mark of a locked
 * value. The icon is inlined, so the components load without Obsidian in unit tests.
 */
function InfoIcon(): JSX.Element {
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
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
