/**
 * Command *Copy link to field*: copies to the clipboard a link to the field that holds, or held
 * last, the focus in the form of the active instance.
 *
 * The link designates the record by its identifier when the index of identifiers resolves the
 * identifier of the record to its file alone, as a URI of ekphrasis written as a Markdown link.
 * Otherwise, the link designates the file by its path, in the link format set in the settings of
 * Obsidian, through `FileManager.generateMarkdownLink`. The note that will hold the link is
 * unknown when the link is copied, so a link by path is written as from the vault root.
 */
import { Notice, TFile, type FileManager, type Plugin, type Vault } from "obsidian";
import {
  fieldLinkByIdentifier,
  fieldLinkByPath,
  type FieldLinkText,
  type LinkFormatter,
  type RecordIdentifiers,
} from "../../application";
import type { FormModel } from "../../domain";
import { EkphrasisError } from "../../errors";
import { InstanceView } from "./views/instance-view";

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

/**
 * Registers the command `command`, available in the form view of an instance whose field was
 * focused.
 */
export function registerCopyFieldLink(
  plugin: Plugin,
  command: { readonly id: string; readonly name: string },
  identifiers: RecordIdentifiers,
): void {
  const { workspace, vault, fileManager } = plugin.app;
  const formatter = new ObsidianLinkFormatter(vault, fileManager);
  plugin.addCommand({
    ...command,
    checkCallback: (checking) => {
      const view = workspace.getActiveViewOfType(InstanceView);
      const path = view?.filePath ?? null;
      const form = view?.form ?? null;
      const fieldId = view?.focusedId ?? null;
      if (view?.mode !== "form" || path === null || form === null || fieldId === null) {
        return false;
      }
      if (!checking) void copyLink(formatter, identifiers, path, form.model, fieldId);
      return true;
    },
  });
}

/**
 * Identifier of the record at `path` when it designates that record alone, and else `null`, so a
 * record whose identifier is ambiguous is linked by its path.
 */
function uniqueIdentifier(identifiers: RecordIdentifiers, path: string): string | null {
  const identifier = identifiers.identifierOf(path);
  if (identifier === null) return null;
  const resolution = identifiers.resolve(identifier);
  return resolution.status === "found" && resolution.path === path ? identifier : null;
}

async function copyLink(
  formatter: LinkFormatter,
  identifiers: RecordIdentifiers,
  path: string,
  model: FormModel,
  fieldId: string,
): Promise<void> {
  let result: FieldLinkText;
  try {
    const identifier = uniqueIdentifier(identifiers, path);
    result =
      identifier === null
        ? fieldLinkByPath(formatter, path, model, fieldId)
        : fieldLinkByIdentifier(identifier, model, fieldId);
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
