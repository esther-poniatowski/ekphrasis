/**
 * Edits of the entries of a collection: insertion, removal and reordering, in a block collection,
 * whose entries stand on lines of their own, and in a flow collection, written between brackets
 * or braces with separating commas. Each edit keeps the form of its collection, as the feature
 * note on saving specifies.
 *
 * An entry is an item of a sequence, or a key with its value in a mapping. The editor locates
 * each entry from the ranges of the tree, and refuses an edit whose place it cannot determine.
 */
import { EkphrasisError } from "../../errors";
import type { MappingEntry, MappingNode, SequenceNode, SourceRange, YamlNode } from "../model";
import { splice, type SourceEdit, type TextPart } from "./source-edit";
import type { SourceText } from "./source-text";

/** Raised when an edit has no place it can be written at; the planner turns it into a refusal. */
export class Unplaceable extends EkphrasisError {
  override name = "Unplaceable";

  constructor(readonly reason: "unlocated" | "comment") {
    super(reason);
  }
}

const unplaceable = (reason: "unlocated" | "comment" = "unlocated"): never => {
  throw new Unplaceable(reason);
};

/** Collection whose entries an edit inserts, removes or reorders. */
export type Collection = MappingNode | SequenceNode;

/** Source span of one entry: the key and the value of a mapping entry, or an item. */
interface Span {
  readonly start: number;
  readonly end: number;
}

const isBlockScalar = (node: YamlNode): boolean =>
  node.kind === "scalar" && (node.style === "literal" || node.style === "folded");

export class CollectionEdits {
  constructor(private readonly source: SourceText) {}

  // --- Spans -------------------------------------------------------------------------------------

  /** Spans of the entries of `collection`, in their order. */
  spans(collection: Collection): Span[] {
    if (collection.kind === "sequence") {
      return collection.items.map((item) => item.range ?? unplaceable());
    }
    return collection.entries.map((entry) => this.entrySpan(entry));
  }

  private entrySpan(entry: MappingEntry): Span {
    const key = entry.keyRange ?? unplaceable();
    const value = entry.value.range;
    return { start: key.start, end: Math.max(key.end, value?.end ?? key.end) };
  }

  /**
   * Offset where the lines of a block entry spanning `span` end: after the line break of its last
   * line, which a block value includes in its span, and which follows the value or its comment
   * otherwise.
   */
  lineEnd(span: Span): number {
    if (span.end > span.start && this.source.text.charAt(span.end - 1) === "\n") return span.end;
    return this.source.nextLineStart(span.end);
  }

  /** Offset of the indicator `-` of the block item spanning `span`, alone before it on its line. */
  private dashOf(span: Span): number {
    let offset = span.start - 1;
    while (offset >= 0 && this.source.text.charAt(offset) === " ") offset -= 1;
    if (this.source.text.charAt(offset) !== "-" || !this.source.startsLine(offset)) {
      return unplaceable();
    }
    return offset;
  }

  /** Offset of the first character of the lines of the entry spanning `span` in `collection`. */
  private linesStart(collection: Collection, span: Span): number {
    const first = collection.kind === "sequence" ? this.dashOf(span) : span.start;
    if (!this.source.startsLine(first)) return unplaceable();
    return this.source.lineStart(first);
  }

  /** Column of the lines of the entry spanning `span`: of its key, or of its indicator `-`. */
  column(collection: Collection, span: Span): number {
    const first = collection.kind === "sequence" ? this.dashOf(span) : span.start;
    return this.source.column(first);
  }

  // --- Block collections -------------------------------------------------------------------------

  /**
   * Inserts the lines `lines`, written for the column of the entries, as the entry at position
   * `index` of the non-empty block collection `collection`: before the lines of the entry at that
   * position, or after the lines of the last entry.
   */
  insertBlock(
    collection: Collection,
    index: number,
    lines: (indent: number, indentFirst: boolean) => TextPart[],
  ): SourceEdit[] {
    const spans = this.spans(collection);
    const following = spans[index];
    if (following !== undefined) {
      const at = this.linesStart(collection, following);
      return [splice(at, at, lines(this.column(collection, following), true))];
    }
    const last = spans.at(-1) ?? unplaceable();
    const at = this.lineEnd(last);
    return [
      splice(at, at, [this.lineBreakBefore(at), ...lines(this.column(collection, last), true)]),
    ];
  }

  /**
   * Removes the lines of the entry at position `index` of the block collection `collection`. Each
   * comment on them stays, on a line of its own at the column of the entry.
   */
  removeBlock(collection: Collection, index: number): SourceEdit[] {
    const spans = this.spans(collection);
    const span = spans[index] ?? unplaceable();
    const start = this.linesStart(collection, span);
    const end = this.lineEnd(span);
    const pad = " ".repeat(this.column(collection, span));
    const kept = this.commentsOf(start, end, entryNodes(collection, index)).map(
      (comment) => `${pad}${comment}\n`,
    );
    return [splice(start, end, kept)];
  }

  // --- Flow collections --------------------------------------------------------------------------

  /**
   * Inserts `text` as the entry at position `index` of the flow collection `collection`, with the
   * separating commas. In a collection whose entries each start a line, the new entry takes a
   * line of its own at the column of its siblings; otherwise it joins the line of its neighbour.
   */
  insertFlow(collection: Collection, index: number, text: readonly TextPart[]): SourceEdit[] {
    const range = collection.range ?? unplaceable();
    const spans = this.spans(collection);
    if (spans.length === 0) return [splice(range.start + 1, range.start + 1, text)];
    const multiline = this.multiline(spans);
    const neighbour = spans[Math.max(0, index - 1)] ?? unplaceable();
    const pad = " ".repeat(this.source.column(neighbour.start));
    if (index === 0) {
      const at = neighbour.start;
      return [splice(at, at, [...text, ...(multiline ? [",\n", pad] : [", "])])];
    }
    const comma = this.commaAfter(neighbour.end, range.end);
    if (multiline) {
      return comma === null
        ? [splice(neighbour.end, neighbour.end, [",\n", pad, ...text])]
        : [splice(comma + 1, comma + 1, ["\n", pad, ...text, ","])];
    }
    if (comma !== null && index < spans.length) {
      return [splice(comma + 1, comma + 1, [" ", ...text, ","])];
    }
    return [splice(neighbour.end, neighbour.end, [", ", ...text])];
  }

  /**
   * Removes the entry at position `index` of the flow collection `collection`, with one
   * separating comma. A removal that would remove a comment is refused.
   */
  removeFlow(collection: Collection, index: number): SourceEdit[] {
    const range = collection.range ?? unplaceable();
    const spans = this.spans(collection);
    const span = spans[index] ?? unplaceable();
    const multiline = this.multiline(spans);
    let region: SourceRange;
    if (spans.length === 1) {
      region = { start: range.start + 1, end: range.end - 1 };
    } else if (index < spans.length - 1) {
      const next = spans[index + 1] ?? unplaceable();
      region = multiline
        ? { start: this.source.lineStart(span.start), end: this.source.lineStart(next.start) }
        : { start: span.start, end: next.start };
    } else {
      const previous = spans[index - 1] ?? unplaceable();
      const comma = this.commaAfter(span.end, range.end);
      region =
        multiline && comma !== null && this.source.restOfLineBlank(comma + 1)
          ? { start: this.source.lineStart(span.start), end: this.source.nextLineStart(comma) }
          : { start: previous.end, end: span.end };
    }
    if (this.commentsOf(region.start, region.end, entryNodes(collection, index)).length > 0) {
      return unplaceable("comment");
    }
    return [splice(region.start, region.end, [])];
  }

  /** Whether each entry of a flow collection starts a line of its own. */
  private multiline(spans: readonly Span[]): boolean {
    return spans.length > 0 && spans.every((span) => this.source.startsLine(span.start));
  }

  /** Offset of the comma that follows `offset` before `end`, past spaces and line breaks. */
  private commaAfter(offset: number, end: number): number | null {
    let at = offset;
    while (at < end && /\s/.test(this.source.text.charAt(at))) at += 1;
    return this.source.text.charAt(at) === "," ? at : null;
  }

  // --- Reordering --------------------------------------------------------------------------------

  /**
   * Moves the item at position `from` of `sequence` to the position `to`. The text of each item
   * between both positions moves to the place of its new position, so the separators of the
   * sequence and the comments on lines of their own stay in place, whereas a comment on the last
   * line of an item moves with it.
   */
  move(sequence: SequenceNode, from: number, to: number): SourceEdit[] {
    const slots = sequence.items.map((item) => this.slot(sequence, item));
    const texts = slots.map((slot) => this.source.text.slice(slot.start, slot.end));
    const order = slots.map((_, index) => index);
    const [moved] = order.splice(from, 1);
    if (moved === undefined || to < 0 || to >= slots.length) return unplaceable();
    order.splice(to, 0, moved);
    const edits: SourceEdit[] = [];
    order.forEach((source, position) => {
      const slot = slots[position];
      const text = texts[source];
      if (source !== position && slot !== undefined && text !== undefined) {
        edits.push(splice(slot.start, slot.end, [text]));
      }
    });
    return edits;
  }

  /** Text of an item that moves with it: up to the end of its last line in a block sequence. */
  private slot(sequence: SequenceNode, item: YamlNode): Span {
    const range = item.range ?? unplaceable();
    if (sequence.flow) return range;
    const last = range.end > range.start && this.source.text.charAt(range.end - 1) === "\n";
    return { start: range.start, end: this.source.lineEnd(last ? range.end - 1 : range.end) };
  }

  // --- Positions and comments --------------------------------------------------------------------

  /** Line break needed before an insertion at `at`, when `at` ends a last line without one. */
  lineBreakBefore(at: number): string {
    const text = this.source.text;
    return at === text.length && text !== "" && !text.endsWith("\n") ? "\n" : "";
  }

  /**
   * Comments of the region `[start, end)` holding the nodes `nodes`, without their line breaks.
   * The text of each scalar is skipped, except the header line of a block scalar, so a hash sign
   * inside a value never reads as a comment.
   */
  commentsOf(start: number, end: number, nodes: readonly YamlNode[]): string[] {
    const skipped = nodes
      .flatMap((node) => this.scalarTexts(node))
      .sort((a, b) => a.start - b.start);
    const comments: string[] = [];
    let cursor = start;
    for (const range of skipped) {
      if (range.end <= cursor || range.start >= end) continue;
      if (range.start > cursor) comments.push(...this.source.commentsIn(cursor, range.start));
      cursor = Math.max(cursor, range.end);
    }
    if (cursor < end) comments.push(...this.source.commentsIn(cursor, end));
    return comments;
  }

  /** Ranges of the scalar texts of `node` and of the keys under it. */
  private scalarTexts(node: YamlNode): SourceRange[] {
    switch (node.kind) {
      case "scalar": {
        const range = node.range;
        if (range === null) return [];
        if (!isBlockScalar(node)) return [range];
        return [{ start: this.source.lineEnd(range.start), end: range.end }];
      }
      case "alias":
        return node.range === null ? [] : [node.range];
      case "sequence":
        return node.items.flatMap((item) => this.scalarTexts(item));
      case "mapping":
        return node.entries.flatMap((entry) => [
          ...(entry.keyRange === null ? [] : [entry.keyRange]),
          ...this.scalarTexts(entry.value),
        ]);
    }
  }
}

/** Nodes of the entry at position `index` of `collection`: an item, or the value of a key. */
function entryNodes(collection: Collection, index: number): YamlNode[] {
  if (collection.kind === "sequence") {
    const item = collection.items[index];
    return item === undefined ? [] : [item];
  }
  const entry = collection.entries[index];
  return entry === undefined
    ? []
    : [
        entry.keyRange === null
          ? entry.value
          : {
              kind: "sequence",
              flow: false,
              range: null,
              items: [keyNode(entry.keyRange), entry.value],
            },
      ];
}

/** Scalar standing for the text of a key, so the scan of comments skips it. */
function keyNode(range: SourceRange): YamlNode {
  return { kind: "scalar", value: null, style: "plain", range };
}
