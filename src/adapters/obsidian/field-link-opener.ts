/**
 * Following of field links whose route bypasses the link handling of Obsidian: the URIs of
 * ekphrasis, `obsidian://ekphrasis?id=…&field=…`, received by the protocol handler of the plugin
 * or clicked in a value of a form.
 *
 * A link by identifier resolves through the index of record identifiers, once its first build is
 * complete. An identifier declared by several files opens no file, and a notice lists them. The
 * record found opens in the view of ekphrasis, which receives the field path as the ephemeral
 * state `{subpath}`, as Obsidian passes it for a link by path.
 */
import { Notice, TFile, type App, type ObsidianProtocolData } from "obsidian";
import type { RecordIdentifiers } from "../../application";
import {
  FieldLinkError,
  fieldLinkOfQuery,
  fieldLinkOfUri,
  printSubpath,
  type FieldLink,
  type YamlPath,
} from "../../domain";
import { INSTANCE_VIEW_TYPE } from "./constants";

export class FieldLinkOpener {
  /**
   * @param ready Settles once the index of identifiers holds every record of the vault, so a link
   *   followed while Obsidian starts waits for it.
   */
  constructor(
    private readonly app: App,
    private readonly identifiers: RecordIdentifiers,
    private readonly ready: Promise<void>,
  ) {}

  /** Follows the URI of ekphrasis whose decoded parameters are `parameters`. */
  async followQuery(parameters: ObsidianProtocolData): Promise<void> {
    let link: FieldLink;
    try {
      link = fieldLinkOfQuery(parameters);
    } catch (error) {
      if (!(error instanceof FieldLinkError)) throw error;
      new Notice(`Ekphrasis: ${error.message}`);
      return;
    }
    await this.follow(link, false);
  }

  /**
   * Follows `uri` when it is a URI of ekphrasis, in a new tab when `newLeaf` holds, and returns
   * whether it was one. A malformed URI of ekphrasis opens no file, and a notice states its defect.
   */
  followUri(uri: string, newLeaf: boolean): boolean {
    let link: FieldLink | null;
    try {
      link = fieldLinkOfUri(uri);
    } catch (error) {
      if (!(error instanceof FieldLinkError)) throw error;
      new Notice(`Ekphrasis: ${error.message}`);
      return true;
    }
    if (link === null) return false;
    void this.follow(link, newLeaf);
    return true;
  }

  private async follow(link: FieldLink, newLeaf: boolean): Promise<void> {
    if (link.target.kind !== "identifier") return;
    const { identifier } = link.target;
    await this.ready;
    const resolution = this.identifiers.resolve(identifier);
    switch (resolution.status) {
      case "absent":
        new Notice(`Ekphrasis: no record of the vault declares the identifier \`${identifier}\`.`);
        return;
      case "ambiguous":
        new Notice(
          `Ekphrasis: the identifier \`${identifier}\` is declared by several files, so the link opens none of them:\n` +
            resolution.paths.map((path) => `- ${path}`).join("\n"),
        );
        return;
      case "found":
        await this.openAt(resolution.path, link.field, newLeaf);
    }
  }

  /** Opens the instance at the vault path `path` in the view of ekphrasis, at the field `field`. */
  private async openAt(path: string, field: YamlPath, newLeaf: boolean): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(`Ekphrasis: the file \`${path}\` no longer exists.`);
      return;
    }
    const leaf = this.app.workspace.getLeaf(newLeaf);
    await leaf.setViewState(
      { type: INSTANCE_VIEW_TYPE, state: { file: file.path }, active: true },
      { subpath: printSubpath(field) },
    );
  }
}
