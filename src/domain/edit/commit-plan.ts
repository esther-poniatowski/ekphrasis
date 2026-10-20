/**
 * Plan of a commit: the edits of the source text that write a commit, and the tree that the new
 * text must parse to, as the feature note on saving specifies.
 *
 * A commit sets a scalar field, or changes the entries of a collection. Setting a scalar takes
 * one of five edits:
 *
 * - a value replacing the token of a value: the token is rewritten in place;
 * - a value filling an empty value, written as a bare key: the value is inserted after the colon;
 * - a value at an absent field: the field is inserted with the absent keys and items above it,
 *   after the preceding key in the order of the schema, or as the last item of its sequence;
 * - a cleared optional field: its key is removed, and the comments of its lines are kept;
 * - a cleared required field or item: the first scalar among the unfilled values of the schema is
 *   written, or else the null value.
 *
 * A structural commit inserts an item at a position, removes an item or an entry, or moves an
 * item. Each edit keeps the form of its collection: a block collection receives lines with the
 * indentation of its siblings, and a flow collection receives its entries with their commas. A
 * new collection under a key of a block mapping takes the form of its siblings.
 */
import { EkphrasisError } from "../../errors";
import { isScalarKind, isSingleLineKind } from "../form/kinds";
import type { ItemChange } from "../form/item-identities";
import type { Field, FormModel, MappingField, ScalarField, SequenceField } from "../form/model";
import { fieldChain } from "../form/navigation";
import type {
  MappingEntry,
  MappingNode,
  ScalarNode,
  ScalarStyle,
  ScalarValue,
  SequenceNode,
  SourceRange,
  YamlNode,
  YamlPath,
} from "../model";
import { isJsonScalar } from "../schema/json";
import { UnfilledValues } from "../validation/unfilled";
import { CollectionEdits, Unplaceable } from "./collection-edits";
import { expectedTree, type CommitEffect } from "./expected-tree";
import type { ScalarContext, WrittenValue } from "./scalar-style";
import { childWithSiblingForms, entryWithSiblingForms } from "./sibling-form";
import { INDENT_STEP, scalarPart, splice, type SourceEdit, type TextPart } from "./source-edit";
import { SourceText } from "./source-text";
import {
  entryLines,
  flowNull,
  flowText,
  itemLines,
  nestedValue,
  newScalar,
  scalarText,
} from "./value-text";

/** Value committed at the field of path `path`; the value `null` clears the field. */
export interface ScalarCommit {
  readonly kind?: "set";
  readonly path: YamlPath;
  readonly value: ScalarValue;
}

/** Insertion of the scalar `value` as the item at position `index` of the sequence `path`. */
export interface ItemInsertion {
  readonly kind: "insert-item";
  readonly path: YamlPath;
  readonly index: number;
  readonly value: ScalarValue;
}

/** Removal of the item at `path`. */
export interface ItemRemoval {
  readonly kind: "remove-item";
  readonly path: YamlPath;
}

/** Move of the item at `path` to the position `to` of its sequence. */
export interface ItemMove {
  readonly kind: "move-item";
  readonly path: YamlPath;
  readonly to: number;
}

/** Removal of the entry at `path`, with its key and its value, whatever the value holds. */
export interface EntryRemoval {
  readonly kind: "remove-entry";
  readonly path: YamlPath;
  /**
   * Whether a block mapping left without entries holds the null value, instead of the empty flow
   * mapping `{}`. A switch of alternative sets it, so the first key of the new alternative is
   * written in block form, as the mapping was.
   */
  readonly emptyAsNull?: boolean;
}

export type Commit = ScalarCommit | ItemInsertion | ItemRemoval | ItemMove | EntryRemoval;

/** Change of the items of the sequence of identity `sequence`, made by a commit. */
export interface SequenceChange {
  readonly sequence: string;
  readonly change: ItemChange;
}

export type CommitPlan =
  /** The field already holds the committed value, so the text stays as it is. */
  | { readonly status: "unchanged" }
  | {
      readonly status: "planned";
      readonly edits: readonly SourceEdit[];
      /** Tree that the new text must parse to, compared by content. */
      readonly expected: YamlNode;
      /** Changes of the items of sequences, which the identifiers of items follow. */
      readonly itemChanges: readonly SequenceChange[];
    }
  | { readonly status: "refused"; readonly reason: string };

/** Reasons of the refused commits, displayed at the field. */
export const REFUSALS = {
  missing: "This field no longer exists in the form, so the value was not saved.",
  notScalar: "Only the values of scalar fields are saved from the form.",
  notCollection: "This field holds no collection whose entries the form can change.",
  locked: "This value is written elsewhere in the file, so it is edited there.",
  mismatch:
    "This value does not have the shape that the schema declares; edit it in the source view.",
  position: "This position lies outside the sequence.",
  unlocated:
    "The place of this value in the file could not be determined; edit it in the source view.",
  comment: "This edit would remove a comment; edit the collection in the source view.",
} as const;

/** Plans the commit `commit` on the text `source`, whose form model is `model`. */
export function planCommit(model: FormModel, source: string, commit: Commit): CommitPlan {
  try {
    return new CommitPlanner(model, new SourceText(source)).plan(commit);
  } catch (error) {
    if (error instanceof CommitRefusal) return { status: "refused", reason: error.message };
    if (error instanceof Unplaceable) return { status: "refused", reason: REFUSALS[error.reason] };
    throw error;
  }
}

class CommitRefusal extends EkphrasisError {
  override name = "CommitRefusal";
}

const refuse = (reason: string): never => {
  throw new CommitRefusal(reason);
};

/** What a commit writes at a scalar field. */
type Target =
  | { readonly kind: "value"; readonly value: WrittenValue }
  | { readonly kind: "empty" }
  | { readonly kind: "remove" };

/** Edits of one commit, with their effect on the tree at a path. */
interface Change {
  readonly edits: readonly SourceEdit[];
  readonly path: YamlPath;
  readonly effect: CommitEffect;
  readonly itemChanges: readonly SequenceChange[];
}

const isBlockStyle = (style: ScalarStyle): boolean => style === "literal" || style === "folded";

class CommitPlanner {
  private readonly collections: CollectionEdits;

  constructor(
    private readonly model: FormModel,
    private readonly source: SourceText,
  ) {
    this.collections = new CollectionEdits(source);
  }

  plan(commit: Commit): CommitPlan {
    const chain = fieldChain(this.model.root, commit.path) ?? refuse(REFUSALS.missing);
    const field = chain.at(-1) ?? refuse(REFUSALS.missing);
    const change = this.changeOf(commit, chain, field);
    if (change === null) return { status: "unchanged" };
    const tree = this.model.root.node ?? refuse(REFUSALS.unlocated);
    return {
      status: "planned",
      edits: change.edits,
      expected: expectedTree(tree, change.path, change.effect),
      itemChanges: change.itemChanges,
    };
  }

  /** Change of `commit` at the field `field` ending `chain`, or `null` when it changes nothing. */
  private changeOf(commit: Commit, chain: readonly Field[], field: Field): Change | null {
    switch (commit.kind) {
      case "insert-item":
        return this.insertItem(chain, field, commit.index, commit.value);
      case "remove-item":
        return this.removeItem(chain, field);
      case "move-item":
        return this.moveItem(chain, field, commit.to);
      case "remove-entry":
        return this.removeEntry(chain, field, commit.emptyAsNull === true);
      default:
        return this.setScalar(chain, field, commit.value);
    }
  }

  // --- Scalar fields -----------------------------------------------------------------------------

  /** Change setting the scalar `field` to `value`, or `null` when it already holds the value. */
  private setScalar(chain: readonly Field[], field: Field, value: ScalarValue): Change | null {
    if (!isScalarField(field)) return refuse(REFUSALS.notScalar);
    editable(field);
    const parent = chain.at(-2) ?? null;
    const target = this.target(field, parent, value);
    const node = field.node?.kind === "scalar" ? field.node : null;
    if (isUnchanged(node, target)) return null;
    if (node === null) {
      const written = target.kind === "value" ? target.value : refuse(REFUSALS.unlocated);
      const insertion = this.insertBelow(chain, [], newScalar(written));
      return { ...insertion, path: field.path, effect: { kind: "set", value: written } };
    }
    const { edits, effect } = this.change(field, parent, node, target);
    return { edits, path: field.path, effect, itemChanges: [] };
  }

  /** What setting `field` to `value`, or clearing it when `value` is `null`, writes. */
  private target(field: ScalarField, parent: Field | null, value: ScalarValue): Target {
    if (value !== null) return { kind: "value", value };
    // A cleared item stays in its sequence, like a cleared required field.
    if (!field.required && typeof field.path.at(-1) === "string") {
      // Removing the only key of a mapping would turn the mapping into the null value.
      const entries = parent?.node?.kind === "mapping" ? parent.node.entries : [];
      const onlyKey = field.node !== null && entries.length === 1;
      return onlyKey ? { kind: "empty" } : { kind: "remove" };
    }
    const unfilled = this.model.unfilled.find(isJsonScalar) ?? null;
    return unfilled === null ? { kind: "empty" } : { kind: "value", value: unfilled };
  }

  private change(
    field: ScalarField,
    parent: Field | null,
    node: ScalarNode,
    target: Target,
  ): { edits: SourceEdit[]; effect: CommitEffect } {
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
        const scalar = scalarText(target.value, context, current, indent);
        return { edits: [{ kind: "rewrite", offset: range.start, scalar }], effect };
      }
      case "empty": {
        const effect: CommitEffect = { kind: "set", value: null };
        // An item of a flow sequence cannot be erased, since `[a, ]` holds one item only.
        if (collection?.kind === "sequence" && collection.flow) {
          return { edits: [{ kind: "rewrite", offset: range.start, scalar: flowNull() }], effect };
        }
        return { edits: this.erase(node, range), effect };
      }
      case "remove": {
        if (mapping === null || entry === null) return refuse(REFUSALS.unlocated);
        const index = mapping.entries.indexOf(entry);
        const edits = mapping.flow
          ? this.collections.removeFlow(mapping, index)
          : this.remove(mapping, entry);
        return { edits, effect: { kind: "remove" } };
      }
    }
  }

  /** Writes `value` into the empty value of `entry`, after the colon of its key. */
  private fill(entry: MappingEntry, value: WrittenValue, indent: number): SourceEdit[] {
    const keyRange = entry.keyRange ?? refuse(REFUSALS.unlocated);
    const colon = this.source.colonAfter(keyRange.end) ?? refuse(REFUSALS.unlocated);
    const scalar = scalarText(value, "after-key", null, indent);
    const at = colon + 1;
    if (!isBlockStyle(scalar.style)) return [splice(at, at, [" ", scalarPart(scalar)])];
    // The header joins the key, before any comment of its line; the body starts on the next line.
    const bodyAt = this.source.nextLineStart(colon);
    return [
      splice(at, at, [" ", scalarPart(scalar, "header")]),
      splice(bodyAt, bodyAt, [
        this.collections.lineBreakBefore(bodyAt),
        scalarPart(scalar, "body"),
      ]),
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
    const index = mapping.entries.indexOf(entry);
    if (this.source.startsLine(keyRange.start)) return this.collections.removeBlock(mapping, index);
    const end = this.entryEnd(entry);
    const comments = this.collections.commentsOf(keyRange.end, end, [entry.value]);
    const next = mapping.entries[index + 1]?.keyRange;
    if (next == null) return refuse(REFUSALS.unlocated);
    if (comments.length > 0) return refuse(REFUSALS.comment);
    return [splice(keyRange.start, next.start, [])];
  }

  // --- Insertions --------------------------------------------------------------------------------

  /** Change inserting `value` as the item at position `index` of the sequence `field`. */
  private insertItem(
    chain: readonly Field[],
    field: Field,
    index: number,
    value: ScalarValue,
  ): Change {
    if (!isSequenceField(field)) return refuse(REFUSALS.notCollection);
    editable(field);
    if (index < 0 || index > field.items.length) return refuse(REFUSALS.position);
    const insertion = this.insertBelow(chain, [index], newScalar(value));
    return {
      ...insertion,
      path: field.path,
      effect: { kind: "insert-item", index, value: newScalar(value) },
    };
  }

  /**
   * Edits inserting `leaf` at the path `extra` below the field ending `chain`. The nearest present
   * ancestor receives the absent keys and items between it and the leaf: a mapping receives a key,
   * a sequence an item, and an unfilled value is replaced by a collection holding them.
   */
  private insertBelow(
    chain: readonly Field[],
    extra: readonly (string | number)[],
    leaf: YamlNode,
  ): Pick<Change, "edits" | "itemChanges"> {
    let anchor = chain.length - 1;
    while (anchor >= 0 && chain[anchor]?.node == null) anchor -= 1;
    const owner = chain[anchor] ?? refuse(REFUSALS.unlocated);
    const segments = [
      ...chain.slice(anchor + 1).map((field) => field.path.at(-1) ?? refuse(REFUSALS.unlocated)),
      ...extra,
    ];
    const itemChanges: SequenceChange[] = [];
    segments.forEach((segment, offset) => {
      const sequence = chain[anchor + offset];
      if (typeof segment === "number" && sequence !== undefined) {
        itemChanges.push({ sequence: sequence.uid, change: { kind: "insert", index: segment } });
      }
    });
    const [first, ...rest] = segments;
    if (first === undefined) return refuse(REFUSALS.unlocated);
    const value = nestedValue(rest, leaf);
    const node = owner.node;
    let edits: SourceEdit[];
    if (node?.kind === "mapping" && typeof first === "string" && "children" in owner) {
      const parent = chain[anchor - 1]?.node ?? null;
      edits = this.insertEntry(
        owner,
        node,
        first,
        entryWithSiblingForms(first, value, node, parent),
      );
    } else if (node?.kind === "sequence" && typeof first === "number") {
      if (first > node.items.length) return refuse(REFUSALS.position);
      const item = childWithSiblingForms(value, node);
      edits = node.flow
        ? this.collections.insertFlow(node, first, flowText(item))
        : this.collections.insertBlock(node, first, (indent, indentFirst) =>
            itemLines(item, indent, indentFirst),
          );
    } else if (node?.kind === "scalar" && new UnfilledValues(this.model.unfilled).has(node.value)) {
      edits = this.insertUnderEmpty(chain, anchor, node, nestedValue(segments, leaf));
    } else {
      return refuse(REFUSALS.unlocated);
    }
    return { edits, itemChanges };
  }

  /** Inserts the key `key` holding `value` into the mapping `mapping` of the field `owner`. */
  private insertEntry(
    owner: MappingField,
    mapping: MappingNode,
    key: string,
    value: YamlNode,
  ): SourceEdit[] {
    const index = entryPosition(owner, mapping, key);
    if (mapping.flow) {
      const text: TextPart[] = [
        scalarPart(scalarText(key, "flow", null, 0)),
        ": ",
        ...flowText(value),
      ];
      return this.collections.insertFlow(mapping, index, text);
    }
    const following = mapping.entries[index];
    if (following?.keyRange != null) {
      // The key starts after the indentation of the following key, and restores it after itself.
      const at = following.keyRange.start;
      const indent = this.source.column(at);
      return [splice(at, at, [...entryLines(key, value, indent, false), " ".repeat(indent)])];
    }
    const preceding = mapping.entries.at(-1) ?? refuse(REFUSALS.unlocated);
    const keyStart = preceding.keyRange?.start ?? refuse(REFUSALS.unlocated);
    const at = this.entryEnd(preceding);
    return [
      splice(at, at, [
        this.collections.lineBreakBefore(at),
        ...entryLines(key, value, this.source.column(keyStart), true),
      ]),
    ];
  }

  /**
   * Writes `value` in place of the unfilled value `node` of the field `chain[anchor]`. Under a key
   * of a block mapping, the value takes the form of its siblings: in block form, the token is
   * erased and the value follows on the next lines, one step further indented; in flow form, the
   * value replaces the token, or follows the colon of a bare key. Inside a flow collection, the
   * token is replaced by the flow form of the value. At the root, the keys are appended to the
   * text.
   */
  private insertUnderEmpty(
    chain: readonly Field[],
    anchor: number,
    node: ScalarNode,
    value: YamlNode,
  ): SourceEdit[] {
    const lines = (collection: YamlNode, indent: number): TextPart[] => {
      if (collection.kind === "mapping") {
        return collection.entries.flatMap((e) => entryLines(e.key, e.value, indent, true));
      }
      if (collection.kind === "sequence") {
        return collection.items.flatMap((i) => itemLines(i, indent, true));
      }
      return refuse(REFUSALS.unlocated);
    };
    if (anchor === 0) {
      if (value.kind !== "mapping") return refuse(REFUSALS.unlocated);
      const at = this.source.length;
      const root = childWithSiblingForms(value, null);
      return [splice(at, at, [this.collections.lineBreakBefore(at), ...lines(root, 0)])];
    }
    const owner = chain[anchor];
    const parent = chain[anchor - 1]?.node;
    const range = node.range ?? refuse(REFUSALS.unlocated);
    if ((parent?.kind === "mapping" || parent?.kind === "sequence") && parent.flow) {
      return [splice(range.start, range.end, flowText(value))];
    }
    if (parent?.kind !== "mapping") return refuse(REFUSALS.unlocated);
    const key = owner?.path.at(-1);
    if (typeof key !== "string") return refuse(REFUSALS.unlocated);
    const entry =
      parent.entries.find((candidate) => candidate.key === key) ?? refuse(REFUSALS.unlocated);
    const keyRange = entry.keyRange ?? refuse(REFUSALS.unlocated);
    const shaped = entryWithSiblingForms(key, value, parent, chain[anchor - 2]?.node ?? null);
    const flow = (shaped.kind === "mapping" || shaped.kind === "sequence") && shaped.flow;
    if (flow && range.start < range.end && !isBlockStyle(node.style)) {
      return [splice(range.start, range.end, flowText(shaped))];
    }
    if (flow && range.start === range.end) {
      const colon = this.source.colonAfter(keyRange.end) ?? refuse(REFUSALS.unlocated);
      return [splice(colon + 1, colon + 1, [" ", ...flowText(shaped)])];
    }
    // A block scalar holding the unfilled value spans lines of its own, so the block form is kept.
    const block = flow ? childWithSiblingForms(value, parent) : shaped;
    const erased = range.start === range.end ? [] : this.erase(node, range);
    const at = this.entryEnd(entry);
    const indent = this.source.column(keyRange.start) + INDENT_STEP;
    return [
      ...erased,
      splice(at, at, [this.collections.lineBreakBefore(at), ...lines(block, indent)]),
    ];
  }

  // --- Removals and moves ------------------------------------------------------------------------

  /** Change removing the item `field` from its sequence. */
  private removeItem(chain: readonly Field[], field: Field): Change {
    const index = field.path.at(-1);
    const { sequence, parent } = this.sequenceOf(chain);
    if (typeof index !== "number" || index >= sequence.items.length) {
      return refuse(REFUSALS.position);
    }
    let edits: SourceEdit[];
    if (sequence.flow) {
      edits = this.collections.removeFlow(sequence, index);
    } else if (sequence.items.length === 1) {
      edits = this.emptyCollection(chain.slice(0, -1), sequence, " []");
    } else {
      edits = this.collections.removeBlock(sequence, index);
    }
    return {
      edits,
      path: field.path,
      effect: { kind: "remove" },
      itemChanges: [{ sequence: parent.uid, change: { kind: "remove", index } }],
    };
  }

  /** Change moving the item `field` to the position `to` of its sequence. */
  private moveItem(chain: readonly Field[], field: Field, to: number): Change | null {
    const from = field.path.at(-1);
    const { sequence, parent } = this.sequenceOf(chain);
    if (typeof from !== "number" || from >= sequence.items.length) {
      return refuse(REFUSALS.position);
    }
    if (to < 0 || to >= sequence.items.length) return refuse(REFUSALS.position);
    if (to === from) return null;
    return {
      edits: this.collections.move(sequence, from, to),
      path: parent.path,
      effect: { kind: "move-item", from, to },
      itemChanges: [{ sequence: parent.uid, change: { kind: "move", from, to } }],
    };
  }

  /**
   * Change removing the entry `field`, with its key and its whole value, from its mapping. A block
   * mapping left without entries holds `{}`, or the null value when `emptyAsNull` holds.
   */
  private removeEntry(chain: readonly Field[], field: Field, emptyAsNull: boolean): Change {
    const key = field.path.at(-1);
    const parent = chain.at(-2);
    const mapping = parent?.node?.kind === "mapping" ? parent.node : null;
    if (typeof key !== "string" || mapping === null || field.node === null || !parent) {
      return refuse(REFUSALS.notCollection);
    }
    editable(parent);
    const index = mapping.entries.findIndex((entry) => entry.key === key);
    const entry = mapping.entries[index] ?? refuse(REFUSALS.unlocated);
    const keyStart = entry.keyRange?.start ?? refuse(REFUSALS.unlocated);
    let edits: SourceEdit[];
    if (mapping.flow) {
      edits = this.collections.removeFlow(mapping, index);
    } else if (mapping.entries.length > 1) {
      edits = this.remove(mapping, entry);
    } else if (this.source.startsLine(keyStart)) {
      edits = this.emptyCollection(chain.slice(0, -1), mapping, emptyAsNull ? "" : " {}");
      // The emptied mapping reads back as the null value when no flow mapping replaces it.
      if (emptyAsNull) {
        return {
          edits,
          path: field.path,
          effect: { kind: "remove", emptyAsNull },
          itemChanges: [],
        };
      }
    } else {
      edits = this.emptyItem(entry);
    }
    return { edits, path: field.path, effect: { kind: "remove" }, itemChanges: [] };
  }

  /**
   * Edits removing `entry`, the only entry of a mapping item of a block sequence, whose key
   * follows the indicator `-`: the empty mapping `{}` replaces the key and its value, before any
   * comment of the line. A value spanning lines of its own is refused, since its removal would
   * leave lines that the empty mapping cannot hold.
   */
  private emptyItem(entry: MappingEntry): SourceEdit[] {
    const keyRange = entry.keyRange ?? refuse(REFUSALS.unlocated);
    const value = entry.value;
    const valueEnd = value.range?.end ?? refuse(REFUSALS.unlocated);
    if (value.kind !== "scalar" || isBlockStyle(value.style)) return refuse(REFUSALS.unlocated);
    // The empty value of a bare key may lie before its colon, which the replacement includes.
    const colon = this.source.colonAfter(keyRange.end) ?? refuse(REFUSALS.unlocated);
    return [splice(keyRange.start, Math.max(valueEnd, colon + 1), ["{}"])];
  }

  /** Present sequence holding the item that ends `chain`, with its field. */
  private sequenceOf(chain: readonly Field[]): { sequence: SequenceNode; parent: SequenceField } {
    const parent = chain.at(-2);
    if (parent === undefined || !isSequenceField(parent)) return refuse(REFUSALS.notCollection);
    editable(parent);
    const sequence = parent.node?.kind === "sequence" ? parent.node : null;
    return sequence === null ? refuse(REFUSALS.notCollection) : { sequence, parent };
  }

  /**
   * Edits removing the only entry of the block collection `collection`, the value of the key of
   * the field ending `chain`: its lines are removed, and `empty`, the empty flow collection,
   * follows the colon of the key, since a block collection holds at least one entry.
   */
  private emptyCollection(
    chain: readonly Field[],
    collection: MappingNode | SequenceNode,
    empty: string,
  ): SourceEdit[] {
    const holder = chain.at(-2);
    const owner = holder?.node?.kind === "mapping" ? holder.node : null;
    const key = chain.at(-1)?.path.at(-1);
    const entry = owner?.entries.find((candidate) => candidate.key === key);
    const keyEnd = entry?.keyRange?.end ?? refuse(REFUSALS.unlocated);
    const colon = this.source.colonAfter(keyEnd) ?? refuse(REFUSALS.unlocated);
    return [splice(colon + 1, colon + 1, [empty]), ...this.collections.removeBlock(collection, 0)];
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
    return this.collections.lineEnd({ start: range.start, end: Math.max(range.end, keyEnd) });
  }
}

/**
 * Position at which the key `key` enters the entries of `mapping`. A declared key follows the
 * nearest present key that precedes it in the order of the schema, else precedes the nearest
 * present key that follows it. A key admitted by a pattern or by `additionalProperties` keeps
 * the keys sorted when they are sorted, and else comes last.
 */
function entryPosition(owner: MappingField, mapping: MappingNode, key: string): number {
  const entries = mapping.entries;
  const indexOf = (candidate: unknown): number =>
    entries.findIndex((entry) => entry.key === candidate && entry.keyRange !== null);
  const order = owner.children.map((child) => child.path.at(-1));
  const position = order.indexOf(key);
  if (position >= 0) {
    const before = order
      .slice(0, position)
      .reverse()
      .map(indexOf)
      .find((index) => index >= 0);
    if (before !== undefined) return before + 1;
    const after = order
      .slice(position + 1)
      .map(indexOf)
      .find((index) => index >= 0);
    return after ?? entries.length;
  }
  const keys = entries.map((entry) => entry.key);
  const sorted = keys.every(
    (candidate, index) => index === 0 || (keys[index - 1] ?? "") <= candidate,
  );
  if (!sorted) return entries.length;
  const following = keys.findIndex((candidate) => candidate > key);
  return following < 0 ? entries.length : following;
}

/**
 * Refuses a commit that writes at `field` when its value lies elsewhere in the file or has
 * another shape than the schema declares. Removing or moving an item writes at its collection
 * only, so an item reached through an alias can be removed and moved.
 */
function editable(field: Field): void {
  if (field.lock !== null) refuse(REFUSALS.locked);
  if (field.mismatch !== null) refuse(REFUSALS.mismatch);
}

function isScalarField(field: Field): field is ScalarField {
  return isScalarKind(field.kind);
}

function isSequenceField(field: Field): field is SequenceField {
  return "items" in field;
}

/** Whether `target` leaves the value of `node`, or the absence of a node, as it is. */
function isUnchanged(node: ScalarNode | null, target: Target): boolean {
  if (node === null) return target.kind !== "value";
  if (target.kind === "value") return node.value === target.value;
  return target.kind === "empty" && node.value === null;
}
