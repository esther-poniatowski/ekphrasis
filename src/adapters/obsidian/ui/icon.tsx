/**
 * Icons of the Lucide set drawn by a painter: `setIcon` of Obsidian inside Obsidian, and a painter
 * drawing nothing in unit tests, so the components load without Obsidian. The element of an icon
 * names its icon in the attribute `data-icon`, whatever the painter draws.
 *
 * The kind of each field is shown by the icon of `KIND_ICONS`, drawn at the left of its label as
 * Obsidian draws the type of a property. Where Obsidian gives a property type an icon, the kind
 * closest to that type takes the same icon: `text` for text, `list` for a list, `binary` for a
 * number, and `check-square` for a checkbox.
 */
import type { JSX } from "preact";
import { useLayoutEffect, useRef } from "preact/hooks";
import type { FieldKind } from "../../../domain";

/** Draws the icon named `icon` of the Lucide set into `element`, replacing its content. */
export type IconPainter = (element: HTMLElement, icon: string) => void;

/** Painter drawing no icon, for the component tests outside Obsidian. */
export const NO_ICONS: IconPainter = () => undefined;

/** Icon of each field kind, by its name in the Lucide set bundled with Obsidian. */
export const KIND_ICONS: Readonly<Record<FieldKind, string>> = {
  label: "whole-word",
  text: "text",
  "markdown-line": "letter-text",
  markdown: "pilcrow",
  latex: "sigma",
  number: "binary",
  boolean: "check-square",
  choice: "circle-dot",
  choices: "list-checks",
  list: "list",
  group: "braces",
  table: "table",
  "keyed-table": "table-properties",
  records: "layers",
  "keyed-records": "key-round",
  alternatives: "split",
};

/** Element holding the icon `icon`, drawn by `paint` at each change of the icon. */
export function Icon({
  icon,
  paint,
  class: className,
}: {
  readonly icon: string;
  readonly paint: IconPainter;
  readonly class: string;
}): JSX.Element {
  const element = useRef<HTMLSpanElement | null>(null);
  useLayoutEffect(() => {
    if (element.current !== null) paint(element.current, icon);
  }, [icon, paint]);
  return <span ref={element} class={className} data-icon={icon} aria-hidden="true" />;
}
