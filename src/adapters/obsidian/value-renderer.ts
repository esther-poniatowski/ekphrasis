/**
 * Renderer of the values of the form through the renderers of Obsidian, as the decision on field
 * rendering records: the Markdown renderer for the kinds `markdown` and `markdown-line`, and the
 * math renderer, as a display formula, for the kind `latex`.
 *
 * The Markdown renderer receives the path of the instance as the source path, so the links of a
 * value resolve from the folder of the instance, and a click on an internal link opens its note,
 * or its YAML file at the field of its subpath. A field link whose subpath holds no valid field
 * path opens no file, and a notice states its defect. A click on a URI of ekphrasis follows the
 * link by identifier, and a click on any other external link keeps the behaviour of Obsidian.
 * Each Markdown rendering owns a child component of the view, unloaded with the rendering, which
 * releases the post-processors of other plugins.
 */
import {
  Component,
  finishRenderMath,
  Keymap,
  MarkdownRenderer,
  Notice,
  parseLinktext,
  renderMath,
  type App,
} from "obsidian";
import { FieldLinkError, fieldOfFollowedSubpath } from "../../domain";
import { isYamlExtension } from "./constants";
import type { RenderedKind, ValueRenderer } from "./ui/rendering/value-renderer";

export class ObsidianValueRenderer implements ValueRenderer {
  constructor(
    private readonly app: App,
    private readonly sourcePath: () => string,
    private readonly owner: Component,
    private readonly followUri: (uri: string, newLeaf: boolean) => boolean,
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
      const link = (event.target as HTMLElement | null)?.closest("a");
      if (!(link instanceof HTMLElement)) return;
      const newLeaf = Keymap.isModEvent(event);
      if (link.hasClass("external-link")) {
        if (this.followUri(link.getAttribute("href") ?? "", Boolean(newLeaf))) {
          event.preventDefault();
        }
        return;
      }
      if (!link.hasClass("internal-link")) return;
      event.preventDefault();
      const href = link.dataset["href"] ?? link.getAttribute("href") ?? "";
      const defect = this.fieldLinkDefect(href, sourcePath);
      if (defect !== null) {
        new Notice(`Ekphrasis: ${defect}`);
        return;
      }
      void this.app.workspace.openLinkText(href, sourcePath, newLeaf);
    });
    MarkdownRenderer.render(this.app, text, target, sourcePath, component).catch((error: unknown) =>
      console.warn("ekphrasis: a value could not be rendered.", error),
    );
    return () => {
      this.owner.removeChild(component);
      target.empty();
    };
  }

  /**
   * Defect of the internal link `href` when it reaches a YAML file but its subpath holds no valid
   * field path, and else `null`.
   */
  private fieldLinkDefect(href: string, sourcePath: string): string | null {
    const { path, subpath } = parseLinktext(href);
    const file =
      path === ""
        ? this.app.vault.getFileByPath(sourcePath)
        : this.app.metadataCache.getFirstLinkpathDest(path, sourcePath);
    if (file === null || !isYamlExtension(file.extension)) return null;
    try {
      fieldOfFollowedSubpath(subpath);
      return null;
    } catch (error) {
      if (error instanceof FieldLinkError) return error.message;
      throw error;
    }
  }
}
