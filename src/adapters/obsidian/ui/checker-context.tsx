/** Non-issue context supplied by external checkers for the current validation run. */
import type { JSX } from "preact";
import type { CheckerContext } from "../../../application";
import { InlineText } from "./inline-text";

export function CheckerContexts({
  contexts,
}: {
  readonly contexts: readonly CheckerContext[];
}): JSX.Element | null {
  if (contexts.length === 0) return null;
  return (
    <section class="ekphrasis-checker-contexts" aria-label="Validation context">
      {contexts.map((context, index) => (
        <div
          class="ekphrasis-checker-context"
          data-checker={context.checker}
          key={`${context.checker}:${context.label}:${context.value}:${index}`}
        >
          <div class="ekphrasis-checker-context-heading">
            <span class="ekphrasis-checker-context-label">{context.label}</span>
            <code class="ekphrasis-checker-context-value">{context.value}</code>
          </div>
          {context.description !== undefined && (
            <div class="ekphrasis-checker-context-description">
              <InlineText text={context.description} />
            </div>
          )}
          {(context.resultClass !== undefined || context.documentationTarget !== undefined) && (
            <div class="ekphrasis-checker-context-origin">
              {context.resultClass !== undefined && <span>{context.resultClass}</span>}
              {context.documentationTarget !== undefined && (
                <code>{context.documentationTarget}</code>
              )}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
