/**
 * Plan of a commit: the edits of the source text that write a committed value at its field, and
 * the tree that the new text must parse to.
 *
 * Five edits cover the scalar fields, as the feature note on saving specifies:
 *
 * - a value replacing the token of a value: the token is rewritten in place;
 * - a value filling an empty value, written as a bare key: the value is inserted after the colon;
 * - a value at an absent key: the key is inserted after the preceding key in the order of the
 *   schema, with the indentation of its siblings, and with the absent keys above it;
 * - a cleared optional field: its key is removed, and the comments of its lines are kept;
 * - a cleared required field: the first scalar among the unfilled values of the schema is
 *   written, or else the value is erased, leaving the key with an empty value.
 *
 * Keys of a collection written between brackets or braces, and items of a sequence, are added and
 * removed from the milestone *Collections* onward, so such commits are refused with a reason.
 */
import { EkphrasisError } from "../../errors";
import { isScalarKind, isSingleLineKind } from "../form/kinds";
import type { Field, FormModel, MappingField, ScalarField } from "../form/model";
import { fieldChain } from "../form/navigation";
import type {
  MappingEntry,
  MappingNode,
  ScalarNode,
  ScalarStyle,
  ScalarValue,
  SourceRange,
  YamlNode,
  YamlPath,
} from "../model";
import { expectedTree, type CommitEffect } from "./expected-tree";
import {
  selectScalarStyle,
  textOfValue,
  type ScalarContext,
  type WrittenValue,
} from "./scalar-style";
import {
  INDENT_STEP,
  scalarPart,
  splice,
  type ScalarText,
  type SourceEdit,
  type TextPart,
} from "./source-edit";
import { SourceText } from "./source-text";
import { isJsonScalar } from "../schema/json";
import { UnfilledValues } from "../validation/unfilled";

/** Value committed at the field of path `path`; the value `null` clears the field. */
export interface ScalarCommit {
  readonly path: YamlPath;
  readonly value: ScalarValue;
}

export type CommitPlan =
  /** The field already holds the committed value, so the text stays as it is. */
  | { readonly status: "unchanged" }
  | {
      readonly status: "planned";
      readonly edits: readonly SourceEdit[];
      /** Tree that the new text must parse to, compared by content. */
      readonly expected: YamlNode;
    }
  | { readonly status: "refused"; readonly reason: string };

/** Reasons of the refused commits, displayed at the field. */
export const REFUSALS = {
  missing: "This field no longer exists in the form, so the value was not saved.",
  notScalar: "Only the values of scalar fields are saved from the form.",
  locked: "This value is written elsewhere in the file, so it is edited there.",
  mismatch:
    "This value does not have the shape that the schema declares; edit it in the source view.",
  item: "An item cannot be removed from the form yet; remove it in the source view.",
  flow: "A key of a mapping written between braces cannot be added or removed from the form yet; edit it in the source view.",
  unlocated:
    "The place of this value in the file could not be determined; edit it in the source view.",
  comment: "Removing this key would remove a comment on its line; remove it in the source view.",
} as const;

/** Plans the commit `commit` on the text `source`, whose form model is `model`. */
export function planCommit(model: FormModel, source: string, commit: ScalarCommit): CommitPlan {
  try {
    return new CommitPlanner(model, new SourceText(source)).plan(commit);
  } catch (error) {
    if (error instanceof CommitRefusal) return { status: "refused", reason: error.message };
    throw error;
  }
}

class CommitRefusal extends EkphrasisError {
  override name = "CommitRefusal";
}

const refuse = (reason: string): never => {
  throw new CommitRefusal(reason);
};

/** What a commit writes at its field. */
type Target =
  | { readonly kind: "value"; readonly value: WrittenValue }
  | { readonly kind: "empty" }
  | { readonly kind: "remove" };

/** Edits of one commit, with their effect on the tree. */
interface Change {
  readonly edits: readonly SourceEdit[];
  readonly effect: CommitEffect;
}

const isBlockStyle = (style: ScalarStyle): boolean => style === "literal" || style === "folded";

class CommitPlanner {
  constructor(
    private readonly model: FormModel,
    private readonly source: SourceText,
  ) {}

  plan(commit: ScalarCommit): CommitPlan {
    const chain = fieldChain(this.model.root, commit.path) ?? refuse(REFUSALS.missing);
    const field = chain.at(-1) ?? refuse(REFUSALS.missing);
    if (!isScalarField(field)) return refuse(REFUSALS.notScalar);
    if (field.lock !== null) return refuse(REFUSALS.locked);
    if (field.mismatch !== null) return refuse(REFUSALS.mismatch);
    const parent = chain.at(-2) ?? null;
    const target = this.target(field, parent, commit.value);
    const node = field.node?.kind === "scalar" ? field.node : null;
    if (isUnchanged(node, target)) return { status: "unchanged" };
    const change =
      node === null
        ? this.insert(chain, target.kind === "value" ? target.value : refuse(REFUSALS.unlocated))
        : this.change(field, parent, node, target);
    const tree = this.model.root.node ?? refuse(REFUSALS.unlocated);
    return {
      status: "planned",
      edits: change.edits,
      expected: expectedTree(tree, field.path, change.effect),
    };
  }

  /** What setting `field` to `value`, or clearing it when `value` is `null`, writes. */
  private target(field: ScalarField, parent: Field | null, value: ScalarValue): Target {
    if (value !== null) return { kind: "value", value };
    if (typeof field.path.at(-1) === "number") return refuse(REFUSALS.item);
    if (!field.required) {
      // Removing the only key of a mapping would turn the mapping into the null value.
      const entries = parent?.node?.kind === "mapping" ? parent.node.entries : [];
      const onlyKey = field.node !== null && entries.length === 1;
      return onlyKey ? { kind: "empty" } : { kind: "remove" };
    }
    const unfilled = this.model.unfilled.find(isJsonScalar) ?? null;
    return unfilled === null ? { kind: "empty" } : { kind: "value", value: unfilled };
  }

  // --- Present values ----------------------------------------------------------------------------

  private change(
    field: ScalarField,
    parent: Field | null,
    node: ScalarNode,
    target: Target,
  ): Change {
    const range = node.range ?? refuse(REFUSALS.unlocated);
    const collection = parent?.node;
    const mapping = collection?.kind === "mapping" ? collection : null;
    const key = field.path.at(-1);
    const entry =
      mapping === null
        ? null
        : (mapping.entries.find((candidate) => candidate.key === key) ??
          refuse(REFUSALS.unlocated));
    const flow =
      (collection?.kind === "mapping" || collection?.kind === "sequence") && collection.flow;
    const context: ScalarContext = flow ? "flow" : mapping !== null ? "after-key" : "block";
    const indent = this.source.column(entry?.keyRange?.start ?? range.start);

    switch (target.kind) {
      case "value": {
        const effect: CommitEffect = { kind: "set", value: target.value };
        if (range.start === range.end) {
          if (entry === null || context === "flow") return refuse(REFUSALS.unlocated);
          return { edits: this.fill(entry, target.value, indent), effect };
        }
        // A single-line kind drops a block style, so its one line is written plain or quoted.
        const current =
          isSingleLineKind(field.kind) && isBlockStyle(node.style) ? null : node.style;
        const scalar = this.scalarText(target.value, context, current, indent);
        return { edits: [{ kind: "rewrite", offset: range.start, scalar }], effect };
      }
      case "empty":
        return { edits: this.erase(node, range), effect: { kind: "set", value: null } };
      case "remove":
        if (mapping === null || entry === null) return refuse(REFUSALS.unlocated);
        if (mapping.flow) return refuse(REFUSALS.flow);
        return { edits: this.remove(mapping, entry), effect: { kind: "remove" } };
    }
  }

  /** Writes `value` into the empty value of `entry`, after the colon of its key. */
  private fill(entry: MappingEntry, value: WrittenValue, indent: number): SourceEdit[] {
    const keyRange = entry.keyRange ?? refuse(REFUSALS.unlocated);
    const colon = this.source.colonAfter(keyRange.end) ?? refuse(REFUSALS.unlocated);
    const scalar = this.scalarText(value, "after-key", null, indent);
    const at = colon + 1;
    if (!isBlockStyle(scalar.style)) return [splice(at, at, [" ", scalarPart(scalar)])];
    // The header joins the key, before any comment of its line; the body starts on the next line.
    const bodyAt = this.source.nextLineStart(colon);
    return [
      splice(at, at, [" ", scalarPart(scalar, "header")]),
      splice(bodyAt, bodyAt, [this.lineBreakBefore(bodyAt), scalarPart(scalar, "body")]),
    ];
  }

  /** Erases the token of `node`, leaving an empty value and the comments of its lines. */
  private erase(node: ScalarNode, range: SourceRange): SourceEdit[] {
    if (isBlockStyle(node.style)) {
      const [comment] = this.source.commentsIn(range.start, this.source.lineEnd(range.start));
      const lineBreak = this.source.text.charAt(range.end - 1) === "\n" ? "\n" : "";
      return comment === undefined
        ? [splice(this.source.blankRunStart(range.start), range.end, [lineBreak])]
        : [splice(range.start, range.end, [comment, lineBreak])];
    }
    const start = this.source.restOfLineBlank(range.end)
      ? this.source.blankRunStart(range.start)
      : range.start;
    return [splice(start, range.end, [])];
  }

  /**
   * Removes `entry` from the block mapping `mapping`. The lines of the entry are removed, and each
   * comment on them is kept on a line of its own, at the indentation of the key. A key that does
   * not start its line, such as the first key of a sequence item, is removed up to the next key.
   */
  private remove(mapping: MappingNode, entry: MappingEntry): SourceEdit[] {
    const keyRange = entry.keyRange ?? refuse(REFUSALS.unlocated);
    const valueRange = entry.value.range ?? refuse(REFUSALS.unlocated);
    const end = this.entryEnd(entry);
    const block = entry.value.kind === "scalar" && isBlockStyle(entry.value.style);
    const comments = [
      ...this.source.commentsIn(keyRange.end, valueRange.start),
      ...(block
        ? this.source.commentsIn(valueRange.start, this.source.lineEnd(valueRange.start))
        : []),
      ...this.source.commentsIn(valueRange.end, end),
    ];
    if (this.source.startsLine(keyRange.start)) {
      const pad = " ".repeat(this.source.column(keyRange.start));
      const kept = comments.map((comment) => `${pad}${comment}\n`);
      return [splice(this.source.lineStart(keyRange.start), end, kept)];
    }
    const next = mapping.entries[mapping.entries.indexOf(entry) + 1]?.keyRange;
    if (next == null) return refuse(REFUSALS.unlocated);
    if (comments.length > 0) return refuse(REFUSALS.comment);
    return [splice(keyRange.start, next.start, [])];
  }

  // --- Absent values -----------------------------------------------------------------------------

  /**
   * Inserts the key of the absent field ending `chain`, with `value`, under its nearest present
   * ancestor. The absent keys between that ancestor and the field are inserted too.
   */
  private insert(chain: readonly Field[], value: WrittenValue): Change {
    let anchor = chain.length - 2;
    while (anchor >= 0 && chain[anchor]?.node == null) anchor -= 1;
    const owner = chain[anchor] ?? refuse(REFUSALS.unlocated);
    const keys = chain.slice(anchor + 1).map((field) => {
      const key = field.path.at(-1);
      return typeof key === "string" ? key : refuse(REFUSALS.unlocated);
    });
    const effect: CommitEffect = { kind: "set", value };
    const node = owner.node;
    if (node?.kind === "mapping" && "children" in owner) {
      if (node.flow) return refuse(REFUSALS.flow);
      return { edits: this.insertInto(owner, node, keys, value), effect };
    }
    if (node?.kind === "scalar" && new UnfilledValues(this.model.unfilled).has(node.value)) {
      return { edits: this.insertUnderEmpty(chain, anchor, node, keys, value), effect };
    }
    return refuse(REFUSALS.unlocated);
  }

  /** Inserts `keys` into the block mapping `mapping` of the field `owner`. */
  private insertInto(
    owner: MappingField,
    mapping: MappingNode,
    keys: readonly string[],
    value: WrittenValue,
  ): SourceEdit[] {
    const direct = new Map(
      mapping.entries.flatMap((entry) => (entry.keyRange === null ? [] : [[entry.key, entry]])),
    );
    const order = owner.children.map((child) => child.path.at(-1));
    const position = order.indexOf(keys[0]);
    const present = (candidates: readonly unknown[]): MappingEntry | undefined =>
      candidates
        .map((key) => (typeof key === "string" ? direct.get(key) : undefined))
        .find(Boolean);
    const before = position > 0 ? present(order.slice(0, position).reverse()) : undefined;
    const after = before === undefined ? present(order.slice(position + 1)) : undefined;
    if (after?.keyRange != null) {
      const at = after.keyRange.start;
      const indent = this.source.column(at);
      return [splice(at, at, [...this.entryLines(keys, value, indent, false), " ".repeat(indent)])];
    }
    const preceding = before ?? [...direct.values()].at(-1) ?? refuse(REFUSALS.unlocated);
    const keyStart = preceding.keyRange?.start ?? refuse(REFUSALS.unlocated);
    const at = this.entryEnd(preceding);
    const indent = this.source.column(keyStart);
    return [
      splice(at, at, [this.lineBreakBefore(at), ...this.entryLines(keys, value, indent, true)]),
    ];
  }

  /**
   * Inserts `keys` under the unfilled value `node` of the field `chain[anchor]`, which becomes a
   * block mapping: the token of the value, if any, is erased, and the keys follow on the next
   * lines.
   */
  private insertUnderEmpty(
    chain: readonly Field[],
    anchor: number,
    node: ScalarNode,
    keys: readonly string[],
    value: WrittenValue,
  ): SourceEdit[] {
    if (anchor === 0) {
      const at = this.source.length;
      return [splice(at, at, [this.lineBreakBefore(at), ...this.entryLines(keys, value, 0, true)])];
    }
    const owner = chain[anchor];
    const parent = chain[anchor - 1]?.node;
    const key = owner?.path.at(-1);
    if (parent?.kind !== "mapping") return refuse(REFUSALS.unlocated);
    if (parent.flow) return refuse(REFUSALS.flow);
    const entry =
      parent.entries.find((candidate) => candidate.key === key) ?? refuse(REFUSALS.unlocated);
    const keyStart = entry.keyRange?.start ?? refuse(REFUSALS.unlocated);
    const range = node.range ?? refuse(REFUSALS.unlocated);
    const erased = range.start === range.end ? [] : this.erase(node, range);
    const at = this.entryEnd(entry);
    const indent = this.source.column(keyStart) + INDENT_STEP;
    return [
      ...erased,
      splice(at, at, [this.lineBreakBefore(at), ...this.entryLines(keys, value, indent, true)]),
    ];
  }

  /**
   * Lines of the keys `keys`, each nested one step under the previous, the last holding `value`.
   * The lines end with a line break; the first line is not indented when `indentFirst` is false,
   * since its insertion point already follows the indentation of a sibling.
   */
  private entryLines(
    keys: readonly string[],
    value: WrittenValue,
    indent: number,
    indentFirst: boolean,
  ): TextPart[] {
    const parts: TextPart[] = [];
    keys.forEach((key, depth) => {
      const lineIndent = indent + depth * INDENT_STEP;
      if (depth > 0 || indentFirst) parts.push(" ".repeat(lineIndent));
      parts.push(scalarPart(this.scalarText(key, "key", null, lineIndent)), ":");
      if (depth < keys.length - 1) {
        parts.push("\n");
        return;
      }
      const scalar = this.scalarText(value, "after-key", null, lineIndent);
      // A block scalar ends with the line break of its last line.
      parts.push(" ", scalarPart(scalar), ...(isBlockStyle(scalar.style) ? [] : ["\n"]));
    });
    return parts;
  }

  // --- Positions ---------------------------------------------------------------------------------

  /**
   * Offset where the lines of `entry` end: after the line break of its last line, which a block
   * value includes in its range, and which follows the value or its comment otherwise.
   */
  private entryEnd(entry: MappingEntry): number {
    const range = entry.value.range;
    const keyEnd = entry.keyRange?.end ?? refuse(REFUSALS.unlocated);
    if (range === null) return this.source.nextLineStart(keyEnd);
    if (range.end > range.start && this.source.text.charAt(range.end - 1) === "\n")
      return range.end;
    return this.source.nextLineStart(Math.max(range.end, keyEnd));
  }

  /** Line break needed before an insertion at `at`, when `at` ends a last line without one. */
  private lineBreakBefore(at: number): string {
    const text = this.source.text;
    return at === text.length && text !== "" && !text.endsWith("\n") ? "\n" : "";
  }

  private scalarText(
    value: WrittenValue,
    context: ScalarContext,
    current: ScalarStyle | null,
    indent: number,
  ): ScalarText {
    return {
      text: textOfValue(value),
      style: selectScalarStyle(value, context, current),
      context,
      indent,
    };
  }
}

function isScalarField(field: Field): field is ScalarField {
  return isScalarKind(field.kind);
}

/** Whether `target` leaves the value of `node`, or the absence of a node, as it is. */
function isUnchanged(node: ScalarNode | null, target: Target): boolean {
  if (node === null) return target.kind !== "value";
  if (target.kind === "value") return node.value === target.value;
  return target.kind === "empty" && node.value === null;
}
