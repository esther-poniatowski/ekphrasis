/**
 * Spike harness: edits one scalar through the concrete syntax tree of the `yaml` library, and
 * reports which properties of source preservation hold.
 *
 * The harness serves the spike on byte preservation only. The production splice belongs to
 * `src/infrastructure/yaml/`, built in the milestone *Saving of scalars*.
 */
import { Composer, CST, isCollection, isPair, Parser, Scalar, visit, type Document } from "yaml";

/** One scalar of a parsed text, with the position flags that `CST.setScalarValue` requires. */
export interface ScalarSite {
  readonly node: Scalar;
  readonly implicitKey: boolean;
  readonly inFlow: boolean;
  /** A value after a key in block context, whose block scalar content is indented further. */
  readonly afterKey: boolean;
}

/** New text of an edited scalar, with the scalar style to write it in. */
export interface ScalarEdit {
  readonly value: string;
  /** Style of the new text; the style of the edited token is kept when absent. */
  readonly type?: Scalar.Type;
}

/** Properties of one edit; source preservation holds when every property is true. */
export interface EditReport {
  /** Every byte before and after the edited token is identical. */
  readonly untouchedOutsideToken: boolean;
  /** The new text equals the old text with the new token spliced at the old token range. */
  readonly equalsSplice: boolean;
  /** The new text has no more parse errors than the old text, which may already hold some. */
  readonly addsNoParseError: boolean;
  /** The edited scalar parses back to the committed value. */
  readonly readsBack: boolean;
  /** Every comment of the old text appears in the new text, in the same order. */
  readonly keepsComments: boolean;
}

interface ParsedText {
  readonly tokens: CST.Token[];
  readonly documents: Document.Parsed[];
}

function parseText(text: string): ParsedText {
  const tokens = Array.from(new Parser().parse(text));
  const documents = Array.from(new Composer({ keepSourceTokens: true }).compose(tokens));
  return { tokens, documents };
}

const printTokens = (tokens: readonly CST.Token[]): string =>
  tokens.map((token) => CST.stringify(token)).join("");

/** Lists the scalars of the documents in document order, keys included. */
function listSites(documents: readonly Document.Parsed[]): ScalarSite[] {
  const sites: ScalarSite[] = [];
  for (const document of documents) {
    visit(document, {
      Scalar(key, node, path) {
        const inFlow = path.some((ancestor) => isCollection(ancestor) && ancestor.flow === true);
        sites.push({
          node,
          implicitKey: key === "key",
          inFlow,
          afterKey: key === "value" && isPair(path.at(-1)) && !inFlow,
        });
      },
    });
  }
  return sites;
}

/** Collects the text of every comment token, in source order. */
function collectComments(token: unknown, into: string[] = []): string[] {
  if (Array.isArray(token)) {
    for (const item of token) collectComments(item, into);
  } else if (typeof token === "object" && token !== null) {
    const record = token as Record<string, unknown>;
    if (record["type"] === "comment" && typeof record["source"] === "string") {
      into.push(record["source"]);
    }
    for (const value of Object.values(record)) collectComments(value, into);
  }
  return into;
}

/**
 * Indices of the scalars that carry a token of their own. An empty value, such as `key:` with no
 * text, has no token, so writing it is an insertion rather than an edit.
 */
export function editableScalars(text: string): number[] {
  return listSites(parseText(text).documents).flatMap((site, index) =>
    site.node.srcToken ? [index] : [],
  );
}

/** Number of scalars without a token, which an edit in place cannot reach. */
export function tokenlessScalars(text: string): number {
  return listSites(parseText(text).documents).filter((site) => !site.node.srcToken).length;
}

/** Whether the scalar at `index` is a block scalar, introduced by `|` or `>`. */
export function isBlockScalar(text: string, index: number): boolean {
  return listSites(parseText(text).documents)[index]?.node.srcToken?.type === "block-scalar";
}

/** Position flags of the scalar at `index`. */
export function siteOf(text: string, index: number): Omit<ScalarSite, "node"> {
  const site = listSites(parseText(text).documents)[index];
  if (!site) throw new RangeError(`No scalar at index ${index}.`);
  return { implicitKey: site.implicitKey, inFlow: site.inFlow, afterKey: site.afterKey };
}

/** Result of one edit: the new text and the range of the edited token in the old text. */
export interface EditResult {
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly tokenText: string;
}

/** Writes `edit` into the scalar at `index` through `CST.setScalarValue`. */
export function editScalar(text: string, index: number, edit: ScalarEdit): EditResult {
  const { tokens, documents } = parseText(text);
  const site = listSites(documents)[index];
  const token = site?.node.srcToken;
  if (!site || !token) throw new RangeError(`No scalar with a token at index ${index}.`);
  const start = token.offset;
  const end = start + CST.stringify(token).length;
  CST.setScalarValue(token, edit.value, {
    implicitKey: site.implicitKey,
    inFlow: site.inFlow,
    afterKey: site.afterKey,
    ...(edit.type === undefined ? {} : { type: edit.type }),
  });
  return { text: printTokens(tokens), start, end, tokenText: CST.stringify(token) };
}

/** Checks the properties of source preservation for an edit result. */
export function reportEdit(
  oldText: string,
  index: number,
  edit: ScalarEdit,
  result: EditResult,
): EditReport {
  const { text, start, end, tokenText } = result;
  const prefix = oldText.slice(0, start);
  const suffix = oldText.slice(end);
  const original = parseText(oldText);
  const reparsed = parseText(text);
  const errorCount = ({ documents }: ParsedText): number =>
    documents.reduce((count, document) => count + document.errors.length, 0);
  const value = listSites(reparsed.documents)[index]?.node.value;
  const oldComments = collectComments(original.tokens);
  const newComments = collectComments(reparsed.tokens);
  return {
    untouchedOutsideToken: text.startsWith(prefix) && text.endsWith(suffix),
    equalsSplice: text === prefix + tokenText + suffix,
    addsNoParseError: errorCount(reparsed) <= errorCount(original),
    readsBack: typeof value === "string" ? value === edit.value : String(value) === edit.value,
    keepsComments: JSON.stringify(oldComments) === JSON.stringify(newComments),
  };
}

/** Value holding reserved constructions, which a plain scalar cannot represent. */
const RESERVED_TEXT = "a: b # c, [d]";

/** Builds the edit applied to one scalar, from its index and its position. */
export type EditPlan = (text: string, index: number) => ScalarEdit | null;

/** Edits every scalar, keys included, with a value representable in the style of its token. */
export const keepStyle: EditPlan = (text, index) =>
  isBlockScalar(text, index)
    ? { value: `edited ${index}\nsecond line\n` }
    : { value: `edited-${index}` };

/**
 * Edits every value with a value that forces another style: a block scalar or a scalar inside a
 * flow collection becomes single-quoted, and a scalar in block context becomes a literal block.
 */
export const changeStyle: EditPlan = (text, index) => {
  const site = siteOf(text, index);
  if (site.implicitKey) return null;
  if (isBlockScalar(text, index) || site.inFlow) {
    return { value: `${RESERVED_TEXT} ${index}`, type: Scalar.QUOTE_SINGLE };
  }
  return { value: `line ${index}\nline two\n`, type: Scalar.BLOCK_LITERAL };
};

/** Applies `plan` to every editable scalar of `text`, and lists the edits that fail a check. */
export function failingEdits(text: string, plan: EditPlan): string[] {
  return editableScalars(text).flatMap((index) => {
    const edit = plan(text, index);
    if (edit === null) return [];
    const report = reportEdit(text, index, edit, editScalar(text, index, edit));
    const failed = Object.entries(report).filter(([, holds]) => !holds);
    return failed.length === 0
      ? []
      : [`scalar ${index}: ${failed.map(([name]) => name).join(", ")}`];
  });
}
