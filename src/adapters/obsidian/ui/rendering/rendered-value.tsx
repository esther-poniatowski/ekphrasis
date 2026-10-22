/**
 * Value displayed as a note displays it: the renderer of the form writes it into an element of
 * its own. The plain text of the value fills the element until the rendering runs, so the layout
 * holds while the queue renders the visible values first. A rendering is released when its value
 * changes or the element is removed.
 */
import type { HTMLAttributes, JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { FormulaAlign } from "../../../../domain";
import { useFormContext } from "../form-context";
import type { RenderedKind } from "./value-renderer";

export type RenderedValueProps = {
  readonly kind: RenderedKind;
  readonly text: string;
  /** Whether the value renders at once, as instructions shown on demand do, out of the queue. */
  readonly immediate?: boolean;
  /** Classes added to the class of a rendered value. */
  readonly class?: string;
  /** Alignment of a formula of kind `latex`, which the style sheet reads; `center` by default. */
  readonly align?: FormulaAlign;
} & Omit<HTMLAttributes<HTMLDivElement>, "ref" | "class" | "className">;

export function RenderedValue({
  kind,
  text,
  immediate = false,
  class: className,
  align = "center",
  ...attributes
}: RenderedValueProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const { renderer, scheduler } = useFormContext();
  useEffect(() => {
    const target = ref.current;
    if (target === null) return;
    target.textContent = text;
    const job = (): (() => void) => renderer.render(target, kind, text);
    return immediate ? job() : scheduler.request(target, job);
  }, [kind, text, immediate, renderer, scheduler]);
  return (
    <div
      {...attributes}
      ref={ref}
      class={className === undefined ? "ekphrasis-rendered" : `ekphrasis-rendered ${className}`}
      data-kind={kind}
      data-align={kind === "latex" ? align : undefined}
    />
  );
}
