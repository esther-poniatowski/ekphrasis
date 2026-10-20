/**
 * Renderer of the values of the form through the renderers of Obsidian, as the decision on field
 * rendering records: the Markdown renderer for the kinds `markdown` and `markdown-line`, and the
 * math renderer, as a display formula, for the kind `latex`.
 *
 * The Markdown renderer receives the path of the instance as the source path, so the links of a
 * value resolve from the folder of the instance, and a click on an internal link opens its note.
 * Each Markdown rendering owns a child component of the view, unloaded with the rendering, which
 * releases the post-processors of other plugins.
 */
import {
  Component,
  finishRenderMath,
  Keymap,
  MarkdownRenderer,
  renderMath,
  type App,
} from "obsidian";
import type { RenderedKind, ValueRenderer } from "./ui/rendering/value-renderer";

export class ObsidianValueRenderer implements ValueRenderer {
  constructor(
    private readonly app: App,
    private readonly sourcePath: () => string,
    private readonly owner: Component,
  ) {}

  render(target: HTMLElement, kind: RenderedKind, text: string): () => void {
    target.empty();
    if (kind === "latex") {
      try {
        target.appendChild(renderMath(text, true));
        void finishRenderMath();
      } catch (error) {
        // MathJax loads after the plugin, so a formula rendered before it is ready stays as text.
        console.warn("ekphrasis: a formula could not be rendered.", error);
        target.setText(text);
      }
      return () => target.empty();
    }
    const component = this.owner.addChild(new Component());
    const sourcePath = this.sourcePath();
    component.registerDomEvent(target, "click", (event) => {
      const link = (event.target as HTMLElement | null)?.closest("a.internal-link");
      if (!(link instanceof HTMLElement)) return;
      event.preventDefault();
      const href = link.dataset["href"] ?? link.getAttribute("href") ?? "";
      void this.app.workspace.openLinkText(href, sourcePath, Keymap.isModEvent(event));
    });
    MarkdownRenderer.render(this.app, text, target, sourcePath, component).catch((error: unknown) =>
      console.warn("ekphrasis: a value could not be rendered.", error),
    );
    return () => {
      this.owner.removeChild(component);
      target.empty();
    };
  }
}
