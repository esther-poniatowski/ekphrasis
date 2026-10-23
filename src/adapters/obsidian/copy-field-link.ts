/**
 * Command *Copy link to field*: copies to the clipboard a link by path to the field that holds, or
 * held last, the focus in the form of the active instance.
 *
 * The link follows the link format set in the settings of Obsidian, through
 * `FileManager.generateMarkdownLink`. The note that will hold the link is unknown when the link is
 * copied, so the link is written as from the vault root.
 */
import { Notice, TFile, type FileManager, type Plugin, type Vault } from "obsidian";
import { fieldLinkByPath, type FieldLinkText, type LinkFormatter } from "../../application";
import type { FormModel } from "../../domain";
import { EkphrasisError } from "../../errors";
import { InstanceView } from "./views/instance-view";

/** Identifier and name of the command, to join `COMMANDS` of `commands.ts` once registered. */
export const COPY_FIELD_LINK_COMMAND = { id: "copy-link-to-field", name: "Copy link to field" };

/** Source path given to Obsidian for a link whose note is unknown: the vault root. */
const UNKNOWN_SOURCE = "";

/** Implementation of the `LinkFormatter` port over the file manager of Obsidian. */
export class ObsidianLinkFormatter implements LinkFormatter {
  constructor(
    private readonly vault: Vault,
    private readonly fileManager: FileManager,
    private readonly sourcePath: string = UNKNOWN_SOURCE,
  ) {}

  /** @throws EkphrasisError When no file of the vault lies at `path`. */
  linkTo(path: string, subpath: string, alias: string): string {
    const file = this.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      throw new EkphrasisError(`The file \`${path}\` no longer exists.`);
    }
    return this.fileManager.generateMarkdownLink(file, this.sourcePath, subpath, alias);
  }
}

/** Registers the command, available in the form view of an instance whose field was focused. */
export function registerCopyFieldLink(plugin: Plugin): void {
  const { workspace, vault, fileManager } = plugin.app;
  const formatter = new ObsidianLinkFormatter(vault, fileManager);
  plugin.addCommand({
    ...COPY_FIELD_LINK_COMMAND,
    checkCallback: (checking) => {
      const view = workspace.getActiveViewOfType(InstanceView);
      const path = view?.filePath ?? null;
      const form = view?.form ?? null;
      const fieldId = view?.focusedId ?? null;
      if (view?.mode !== "form" || path === null || form === null || fieldId === null) {
        return false;
      }
      if (!checking) void copyLink(formatter, path, form.model, fieldId);
      return true;
    },
  });
}

async function copyLink(
  formatter: LinkFormatter,
  path: string,
  model: FormModel,
  fieldId: string,
): Promise<void> {
  let result: FieldLinkText;
  try {
    result = fieldLinkByPath(formatter, path, model, fieldId);
  } catch (error) {
    if (!(error instanceof EkphrasisError)) throw error;
    new Notice(error.message);
    return;
  }
  if (result.status === "refused") {
    new Notice(result.reason);
    return;
  }
  await navigator.clipboard.writeText(result.text);
  new Notice(`Link copied: ${result.text}`);
}
