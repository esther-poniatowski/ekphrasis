/**
 * Field links: the designation of one field of a YAML instance, written in a note or in a value
 * of a form, as the specification of links states.
 *
 * A link by path names the file of the instance, then the field path after a hash sign, as a
 * Markdown link (`[aim](questions/intermittency.yml#task.epistemic_aim)`) or as a wikilink
 * (`[[intermittency.yml#task.epistemic_aim]]`). A link by identifier names the record by the value
 * of its identifier, in a URI of Obsidian handled by ekphrasis
 * (`obsidian://ekphrasis?id=quest.pendulum.sustained-oscillation&field=task.epistemic_aim`), as
 * the decision on record identifiers records. A link without a field path designates the root of
 * the instance.
 *
 * The parser does not decide whether the path of a link reaches a YAML file: a link by path to a
 * note, such as `[[note#Heading]]`, parses as well, and the caller interprets the result only once
 * the path resolves to an instance.
 */
import { EkphrasisError } from "../../errors";
import { isUri } from "../files/vault-paths";
import type { YamlPath } from "../model";
import {
  ANY_ITEM,
  ANY_KEY,
  FieldPathError,
  parseFieldPath,
  printFieldPath,
  type PatternSegment,
} from "../paths/field-path";

/** Action of the URIs of Obsidian handled by ekphrasis, as in `obsidian://ekphrasis?…`. */
export const LINK_ACTION = "ekphrasis";

/** Names of the parameters of a URI of ekphrasis. */
export const LINK_PARAMETERS = { identifier: "id", field: "field", vault: "vault" } as const;

/** Record designated by a field link. */
export type RecordTarget =
  /**
   * Path of the file, as written in the link and percent-decoded: relative, from the vault root,
   * or a name resolved by Obsidian. The empty path designates the file holding the link.
   */
  | { readonly kind: "path"; readonly linkpath: string }
  /** Identifier of the record, with the name of the vault when the URI names one. */
  | { readonly kind: "identifier"; readonly identifier: string; readonly vault: string | null };

export interface FieldLink {
  readonly target: RecordTarget;
  /** Path of the designated field; the empty path designates the root of the instance. */
  readonly field: YamlPath;
}

/** Raised when a text is a malformed field link, with the reason. */
export class FieldLinkError extends EkphrasisError {
  override name = "FieldLinkError";
}

// --- Parsing -------------------------------------------------------------------------------------

/**
 * Parses one link, written as a Markdown link, a wikilink, a URI or a URI between angle brackets.
 * Returns `null` for a link that designates no field: an embed `![[…]]`, a URI of another scheme
 * than `obsidian`, or a URI of Obsidian with another action than `ekphrasis`.
 *
 * @throws FieldLinkError When the text is no link, or a malformed field link.
 */
export function parseFieldLink(text: string): FieldLink | null {
  const link = text.trim();
  if (link.startsWith("![[")) return null;
  if (link.startsWith("[[")) return parseWikilink(link);
  if (link.startsWith("[")) return parseMarkdownLink(link);
  if (link.startsWith("<") && link.endsWith(">")) return parseDestination(link.slice(1, -1), link);
  if (isUri(link)) return fieldLinkOfUri(link);
  throw new FieldLinkError(
    `The text \`${text}\` is no Markdown link, no wikilink and no URI, so it designates no field.`,
  );
}

/**
 * Parses the link text of an internal link, as Obsidian passes it once decoded: a path, then a
 * field path after the first hash sign, such as `questions/intermittency.yml#task.epistemic_aim`.
 *
 * @throws FieldLinkError When the field path is malformed.
 */
export function fieldLinkOfLinktext(linktext: string): FieldLink {
  const hash = linktext.indexOf("#");
  const linkpath = hash < 0 ? linktext : linktext.slice(0, hash);
  const subpath = hash < 0 ? "" : linktext.slice(hash);
  return { target: { kind: "path", linkpath }, field: fieldOfSubpath(subpath, linktext) };
}

/**
 * Field path of a subpath, the empty text or a hash sign followed by a field path, such as
 * `#task.epistemic_aim`; the empty subpath designates the root.
 *
 * @throws FieldLinkError When the subpath is a bare hash sign, or holds a malformed field path.
 */
export function fieldOfSubpath(subpath: string, link: string = subpath): YamlPath {
  if (subpath === "") return [];
  if (!subpath.startsWith("#")) {
    throw new FieldLinkError(`The subpath \`${subpath}\` of \`${link}\` must start with \`#\`.`);
  }
  if (subpath === "#") {
    throw new FieldLinkError(`The link \`${link}\` holds no field path after its hash sign.`);
  }
  return designatedField(subpath.slice(1), link);
}

/**
 * Field path of the subpath that Obsidian passes to a view when it follows a link, such as
 * `#rows[1].name`. A subpath that holds no valid field path is read again percent-decoded, since
 * a Markdown link may encode its spaces and quotes.
 *
 * @throws FieldLinkError When the subpath holds no field path, encoded or not.
 */
export function fieldOfFollowedSubpath(subpath: string): YamlPath {
  try {
    return fieldOfSubpath(subpath);
  } catch (error) {
    if (!(error instanceof FieldLinkError)) throw error;
    let decodedSubpath: string;
    try {
      decodedSubpath = decodeURIComponent(subpath);
    } catch {
      throw error;
    }
    if (decodedSubpath === subpath) throw error;
    return fieldOfSubpath(decodedSubpath, subpath);
  }
}

/**
 * Parses a URI. Returns `null` for a URI of another scheme than `obsidian`, or of another action
 * than `ekphrasis`. The values of the query are percent-decoded; a plus sign stays a plus sign.
 *
 * @throws FieldLinkError When a URI of ekphrasis is malformed.
 */
export function fieldLinkOfUri(uri: string): FieldLink | null {
  const match = /^obsidian:\/\/([^?#/]*)\/?(?:\?([^#]*))?$/i.exec(uri);
  if (match === null || match[1]?.toLowerCase() !== LINK_ACTION) return null;
  return fieldLinkOfQuery(parseQuery(match[2] ?? "", uri), uri);
}

/**
 * Field link of the decoded parameters of a URI of ekphrasis, as the protocol handler of Obsidian
 * receives them. The parameter `action` and every unknown parameter are ignored.
 *
 * @throws FieldLinkError When the identifier is absent or empty, or the field path is malformed.
 */
export function fieldLinkOfQuery(
  parameters: Readonly<Record<string, string | undefined>>,
  link = `obsidian://${LINK_ACTION}`,
): FieldLink {
  const identifier = parameters[LINK_PARAMETERS.identifier] ?? "";
  if (identifier === "") {
    throw new FieldLinkError(
      `The link \`${link}\` names no record: its parameter \`${LINK_PARAMETERS.identifier}\` is absent or empty.`,
    );
  }
  const vault = parameters[LINK_PARAMETERS.vault];
  return {
    target: {
      kind: "identifier",
      identifier,
      vault: vault === undefined || vault === "" ? null : vault,
    },
    field: designatedField(parameters[LINK_PARAMETERS.field] ?? "", link),
  };
}

function parseWikilink(link: string): FieldLink {
  if (!link.endsWith("]]")) {
    throw new FieldLinkError(`The wikilink \`${link}\` is not closed by \`]]\`.`);
  }
  const content = link.slice(2, -2);
  const bar = content.indexOf("|");
  return fieldLinkOfLinktext(bar < 0 ? content : content.slice(0, bar));
}

function parseMarkdownLink(link: string): FieldLink | null {
  const close = closingBracket(link);
  if (close < 0 || link[close + 1] !== "(" || !link.endsWith(")")) {
    throw new FieldLinkError(
      `The Markdown link \`${link}\` must take the form \`[text](destination)\`.`,
    );
  }
  let destination = link.slice(close + 2, -1).trim();
  if (destination.startsWith("<") && destination.endsWith(">")) {
    destination = destination.slice(1, -1);
  } else if (/\s/.test(destination)) {
    throw new FieldLinkError(
      `The destination of the Markdown link \`${link}\` holds a space, which must be written \`%20\`, or the destination enclosed in angle brackets.`,
    );
  }
  return parseDestination(destination, link);
}

/** Offset of the bracket closing the text of a Markdown link, skipping nested and escaped ones. */
function closingBracket(link: string): number {
  let depth = 0;
  for (let index = 0; index < link.length; index += 1) {
    const char = link[index];
    if (char === "\\") index += 1;
    else if (char === "[") depth += 1;
    else if (char === "]" && --depth === 0) return index;
  }
  return -1;
}

/** Field link of the destination of a Markdown link, percent-decoded on each side of the hash. */
function parseDestination(destination: string, link: string): FieldLink | null {
  if (isUri(destination)) return fieldLinkOfUri(destination);
  const hash = destination.indexOf("#");
  const linkpath = decode(hash < 0 ? destination : destination.slice(0, hash), link);
  const subpath = hash < 0 ? "" : `#${decode(destination.slice(hash + 1), link)}`;
  return { target: { kind: "path", linkpath }, field: fieldOfSubpath(subpath, link) };
}

/** Parameters of a query, each name and value percent-decoded. */
function parseQuery(query: string, link: string): Record<string, string> {
  const parameters = new Map<string, string>();
  for (const pair of query.split("&")) {
    if (pair === "") continue;
    const equals = pair.indexOf("=");
    const name = decode(equals < 0 ? pair : pair.slice(0, equals), link);
    if (parameters.has(name)) {
      throw new FieldLinkError(`The link \`${link}\` repeats the parameter \`${name}\`.`);
    }
    parameters.set(name, equals < 0 ? "" : decode(pair.slice(equals + 1), link));
  }
  return Object.fromEntries(parameters);
}

function decode(text: string, link: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    throw new FieldLinkError(`The link \`${link}\` holds a malformed percent-encoding.`);
  }
}

/** Path of the one field designated by `text`, the root for the empty text; a link holds no wildcard. */
function designatedField(text: string, link: string): YamlPath {
  if (text === "") return [];
  let segments: PatternSegment[];
  try {
    segments = parseFieldPath(text);
  } catch (error) {
    if (error instanceof FieldPathError) {
      throw new FieldLinkError(
        `The link \`${link}\` holds a malformed field path. ${error.message}`,
      );
    }
    throw error;
  }
  const path: (string | number)[] = [];
  for (const segment of segments) {
    if (segment === ANY_ITEM || segment === ANY_KEY) {
      throw new FieldLinkError(
        `The field path \`${text}\` of the link \`${link}\` holds a wildcard, whereas a link designates one field.`,
      );
    }
    path.push(segment);
  }
  return path;
}

// --- Printing ------------------------------------------------------------------------------------

/** Subpath designating `field` in a link by path: `""` for the root, else `#` and the path. */
export function printSubpath(field: YamlPath): string {
  return field.length === 0 ? "" : `#${printFieldPath(field)}`;
}

/**
 * URI of ekphrasis designating `field` of the record `identifier`, each value percent-encoded,
 * the vault first when it is named, as in the URIs of Obsidian.
 */
export function printIdentifierUri(
  identifier: string,
  field: YamlPath,
  vault: string | null = null,
): string {
  const parameters: [string, string][] = [];
  if (vault !== null) parameters.push([LINK_PARAMETERS.vault, vault]);
  parameters.push([LINK_PARAMETERS.identifier, identifier]);
  if (field.length > 0) parameters.push([LINK_PARAMETERS.field, printFieldPath(field)]);
  const query = parameters.map(([name, value]) => `${name}=${encodeURIComponent(value)}`);
  return `obsidian://${LINK_ACTION}?${query.join("&")}`;
}
