/**
 * Use case of the command *Copy link to field*: the text of a link by path to one field of an
 * instance, in the link format set in the host, or of a link by identifier when the record
 * declares an identifier.
 *
 * The host writes the link, Markdown link or wikilink, from the path of the instance, the subpath
 * of the field and its label. The text written is parsed back, and refused when it designates
 * another field, since the host may write a field path holding brackets, quotes or spaces in a
 * form that a link cannot carry.
 */
import {
  FieldLinkError,
  fieldChain,
  fieldOfSubpath,
  parseFieldLink,
  printIdentifierUri,
  printSubpath,
  type Field,
  type FormModel,
  type YamlPath,
} from "../domain";
import type { LinkFormatter } from "./protocols";

/** Outcome of writing a link to a field: its text, or the reason why no link designates it. */
export type FieldLinkText =
  | { readonly status: "link"; readonly text: string }
  | { readonly status: "refused"; readonly reason: string };

/** Field designated by a printed field path of a form model, with the text of a link to it. */
type LinkedField =
  | { readonly status: "field"; readonly path: YamlPath; readonly text: string }
  | { readonly status: "refused"; readonly reason: string };

/**
 * Link by path to the field `fieldId`, a printed field path of `model`, in the instance at the
 * vault path `instancePath`. The displayed text of the link is the label of the field, as
 * {@link linkTextOf} writes it.
 */
export function fieldLinkByPath(
  formatter: LinkFormatter,
  instancePath: string,
  model: FormModel,
  fieldId: string,
): FieldLinkText {
  const linked = linkedField(model, fieldId);
  if (linked.status === "refused") return linked;
  const field = linked.path;
  const text = formatter.linkTo(instancePath, printSubpath(field), linked.text);
  return designates(text, field)
    ? { status: "link", text }
    : {
        status: "refused",
        reason: `The link format of Obsidian writes the link to the field \`${fieldId}\` as \`${text}\`, which designates another field.`,
      };
}

/**
 * Markdown link by identifier to the field `fieldId`, a printed field path of `model`, in the
 * record declaring `identifier`: a URI of ekphrasis, whose displayed text is the label of the
 * field, or the identifier for the root of an untitled record, since a Markdown link without text
 * displays nothing. The URI names no vault, so Obsidian opens it in the open vault.
 */
export function fieldLinkByIdentifier(
  identifier: string,
  model: FormModel,
  fieldId: string,
): FieldLinkText {
  const linked = linkedField(model, fieldId);
  if (linked.status === "refused") return linked;
  return {
    status: "link",
    text: `[${escapeLinkText(linked.text === "" ? identifier : linked.text)}](${printIdentifierUri(identifier, linked.path)})`,
  };
}

/**
 * Text of a link to the last field of `chain`, a chain of fields from the root: its label. An
 * item of a list is labelled by its position only, such as `#2`, so its text joins the text of
 * its list and its own label, such as `Foils #2`, and so on up a list of lists.
 */
export function linkTextOf(chain: readonly Field[]): string {
  const field = chain.at(-1);
  if (field === undefined) return "";
  const parent = chain.at(-2);
  if (parent === undefined || !("items" in parent)) return field.label;
  return [linkTextOf(chain.slice(0, -1)), field.label].filter((part) => part !== "").join(" ");
}

function linkedField(model: FormModel, fieldId: string): LinkedField {
  let path: YamlPath;
  try {
    path = fieldOfSubpath(fieldId === "" ? "" : `#${fieldId}`);
  } catch (error) {
    if (error instanceof FieldLinkError) return { status: "refused", reason: error.message };
    throw error;
  }
  const chain = fieldChain(model.root, path);
  if (chain === null) {
    return { status: "refused", reason: `The form holds no field \`${fieldId}\`.` };
  }
  return { status: "field", path, text: linkTextOf(chain) };
}

/** Text of a Markdown link with its brackets and backslashes escaped. */
const escapeLinkText = (text: string): string => text.replace(/[\\[\]]/g, "\\$&");

/** Whether `text` parses as a link by path to `field`. */
function designates(text: string, field: YamlPath): boolean {
  try {
    const link = parseFieldLink(text);
    return (
      link?.target.kind === "path" &&
      link.field.length === field.length &&
      link.field.every((segment, index) => segment === field[index])
    );
  } catch (error) {
    if (error instanceof FieldLinkError) return false;
    throw error;
  }
}
