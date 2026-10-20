/**
 * Port through which the form displays a value rendered as in a note, as the decision on field
 * rendering records: the plugin supplies the renderers of Obsidian, and component tests a
 * renderer of plain text.
 */

/** Kind of a value displayed rendered: Markdown, one line of Markdown, or a display formula. */
export type RenderedKind = "markdown" | "markdown-line" | "latex";

export const isRenderedKind = (kind: string): kind is RenderedKind =>
  kind === "markdown" || kind === "markdown-line" || kind === "latex";

export interface ValueRenderer {
  /**
   * Renders `text`, a value of kind `kind`, into `target`, replacing its content, and returns the
   * function that releases the rendering when the value is displayed no more.
   */
  render(target: HTMLElement, kind: RenderedKind, text: string): () => void;
}

/** Renderer writing the text as it stands, for the environments without the renderers of Obsidian. */
export const TEXT_RENDERER: ValueRenderer = {
  render(target, _kind, text) {
    target.textContent = text;
    return () => {
      target.textContent = "";
    };
  },
};
