/**
 * Use case of the command *Copy link to field*: the text of a link by path to one field of an
 * instance, in the link format set in the host.
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
  printSubpath,
  type FormModel,
  type YamlPath,
} from "../domain";
import type { LinkFormatter } from "./protocols";

/** Outcome of writing a link to a field: its text, or the reason why no link designates it. */
export type FieldLinkText =
  | { readonly status: "link"; readonly text: string }
  | { readonly status: "refused"; readonly reason: string };

/**
 * Link by path to the field `fieldId`, a printed field path of `model`, in the instance at the
 * vault path `instancePath`. The displayed text of the link is the label of the field.
 */
export function fieldLinkByPath(
  formatter: LinkFormatter,
  instancePath: string,
  model: FormModel,
  fieldId: string,
): FieldLinkText {
  let field: YamlPath;
  try {
    field = fieldOfSubpath(fieldId === "" ? "" : `#${fieldId}`);
  } catch (error) {
    if (error instanceof FieldLinkError) return { status: "refused", reason: error.message };
    throw error;
  }
  const target = fieldChain(model.root, field)?.at(-1);
  if (target === undefined) {
    return { status: "refused", reason: `The form holds no field \`${fieldId}\`.` };
  }
  const text = formatter.linkTo(instancePath, printSubpath(field), target.label);
  return designates(text, field)
    ? { status: "link", text }
    : {
        status: "refused",
        reason: `The link format of Obsidian writes the link to the field \`${fieldId}\` as \`${text}\`, which designates another field.`,
      };
}

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
