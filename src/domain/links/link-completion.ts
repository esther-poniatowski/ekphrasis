/**
 * Completion of field links: the field path typed after the hash sign of a Markdown link to a
 * YAML file, as in `[aim](questions/intermittency.yml#task.`, and the field paths of the target
 * instance that complete it, as the specification of links states.
 *
 * Only Markdown links are completed: in a wikilink, the suggestion of headings of Obsidian takes
 * over, as the spike of the milestone *Links* observed.
 */
import { extensionOf } from "../files/vault-paths";
import type { FormModel } from "../form/model";
import { buildOutline, type OutlineEntry } from "../form/outline";
import { IssueIndex } from "../validation/issues";

/** Extensions of the files whose links are completed by field paths. */
const COMPLETED_EXTENSIONS: readonly string[] = ["yml", "yaml"];

/** Field path being typed in the destination of a Markdown link to a YAML file. */
export interface SubpathQuery {
  /** Path of the link, percent-decoded when its encoding is valid. */
  readonly linkpath: string;
  /** Text typed after the hash sign, percent-decoded when its encoding is valid. */
  readonly query: string;
  /** Offset, in the text given, of the first character after the hash sign. */
  readonly start: number;
  /** Whether the destination opens with an angle bracket, as in `[aim](<my records/q.yml#`. */
  readonly angled: boolean;
}

/**
 * Field path being typed at the end of `textBefore`, the text of a line before the cursor, or
 * `null` when the cursor lies outside the destination of a Markdown link to a YAML file, or
 * before its hash sign.
 */
export function subpathQueryAt(textBefore: string): SubpathQuery | null {
  const open = textBefore.lastIndexOf("](");
  if (open < 0) return null;
  let offset = open + 2;
  let destination = textBefore.slice(offset);
  const angled = destination.startsWith("<");
  if (angled) {
    destination = destination.slice(1);
    offset += 1;
    if (destination.includes(">")) return null;
  } else if (/[\s()]/.test(destination)) {
    return null;
  }
  const hash = destination.indexOf("#");
  if (hash < 0) return null;
  const linkpath = decoded(destination.slice(0, hash));
  if (!COMPLETED_EXTENSIONS.includes(extensionOf(linkpath))) return null;
  return {
    linkpath,
    query: decoded(destination.slice(hash + 1)),
    start: offset + hash + 1,
    angled,
  };
}

/** Field path proposed to complete a link. */
export interface FieldPathCompletion {
  /** Printed field path of the field. */
  readonly id: string;
  /** Names of the entries from the top of the form down to the field, as the outline names them. */
  readonly trail: readonly string[];
}

/**
 * Field paths of `model` completing `query`, in the order of the outline: first the paths
 * starting with the query, then the paths or names containing it, ignoring case. The empty query
 * proposes every field.
 */
export function fieldPathCompletions(model: FormModel, query: string): FieldPathCompletion[] {
  const all: FieldPathCompletion[] = [];
  const visit = (entries: readonly OutlineEntry[], trail: readonly string[]): void => {
    for (const entry of entries) {
      const names = [...trail, entry.name];
      all.push({ id: entry.id, trail: names });
      visit(entry.children, names);
    }
  };
  // A link may designate an item of a list, so the items of the sequences of scalars are proposed.
  visit(buildOutline(model, IssueIndex.of(model, []), { scalarItems: true }), []);
  const needle = query.toLowerCase();
  if (needle === "") return all;
  const starting = all.filter(({ id }) => id.toLowerCase().startsWith(needle));
  const containing = all.filter(
    ({ id, trail }) =>
      !id.toLowerCase().startsWith(needle) &&
      (id.toLowerCase().includes(needle) || (trail.at(-1) ?? "").toLowerCase().includes(needle)),
  );
  return [...starting, ...containing];
}

/**
 * Text of the field path `id` inside the destination of a Markdown link: a percent sign is
 * encoded, together with a space and a parenthesis outside angle brackets, and an angle bracket
 * inside them, so that the parser of field links reads back `id`.
 */
export function destinationText(id: string, angled: boolean): string {
  const encoded = angled ? /[%<>]/g : /[%\s()<>]/g;
  // `encodeURIComponent` keeps the parentheses, so each character is encoded by its code.
  return id.replace(
    encoded,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
  );
}

/** Text inserted to complete a link, and the offset of the cursor after it, from its start. */
export interface CompletionInsertion {
  readonly text: string;
  readonly cursor: number;
}

/**
 * Insertion of the field path `id` at the cursor of a Markdown link, followed by the characters
 * closing the link (`)`, or `>)` inside angle brackets) that `textAfter`, the text of the line after
 * the cursor, does not already hold. The cursor lands after the closing parenthesis.
 */
export function completionInsertion(
  id: string,
  angled: boolean,
  textAfter: string,
): CompletionInsertion {
  const closing = angled ? ">)" : ")";
  let present = 0;
  while (present < closing.length && textAfter[present] === closing[present]) present += 1;
  const text = destinationText(id, angled) + closing.slice(present);
  return { text, cursor: text.length + present };
}

function decoded(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
