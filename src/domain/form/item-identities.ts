/**
 * Identifiers of the items of sequences, kept across reorderings.
 *
 * A field path counts the items of a sequence by position, so a move, an insertion or a removal
 * changes the path of every following item. The controls of the form are keyed by an identifier
 * of each item instead, which a structural commit carries over to the new form model: a moved
 * item keeps its identifier, and so do the collections nested in it. Each sequence also reserves
 * the identifier of its next item, which the item inserted at its end receives, so a control
 * typed into before the insertion stays the same control after it.
 *
 * A sequence is designated by its identity path: the keys of its mapping ancestors and the
 * identifiers of its item ancestors, printed as one string.
 */

/** Change of the items of one sequence made by a structural commit. */
export type ItemChange =
  | { readonly kind: "insert"; readonly index: number }
  | { readonly kind: "remove"; readonly index: number }
  | { readonly kind: "move"; readonly from: number; readonly to: number };

/** Identifiers of the items of one sequence, and the identifier reserved for its next item. */
export interface SequenceIdentifiers {
  readonly items: readonly string[];
  readonly next: string;
}

interface Entry {
  items: string[];
  next: string;
}

export class ItemIdentities {
  private readonly sequences = new Map<string, Entry>();
  private counter = 0;

  /**
   * Identifiers of the `count` items of the sequence `sequence`. Identifiers already given are
   * kept by position; a sequence that grew outside the form receives new identifiers for its
   * last items, and one that shrank loses its last identifiers.
   */
  of(sequence: string, count: number): SequenceIdentifiers {
    const entry = this.entry(sequence);
    while (entry.items.length < count) entry.items.push(this.mint());
    entry.items.length = count;
    return { items: [...entry.items], next: entry.next };
  }

  /** Applies `change` to the identifiers of `sequence`, after a confirmed structural commit. */
  apply(sequence: string, change: ItemChange): void {
    const entry = this.entry(sequence);
    switch (change.kind) {
      case "insert":
        if (change.index >= entry.items.length) {
          entry.items.push(entry.next);
          entry.next = this.mint();
        } else {
          entry.items.splice(change.index, 0, this.mint());
        }
        return;
      case "remove":
        entry.items.splice(change.index, 1);
        return;
      case "move": {
        const [moved] = entry.items.splice(change.from, 1);
        if (moved !== undefined) entry.items.splice(change.to, 0, moved);
      }
    }
  }

  /**
   * Independent copy of the identifiers, which a sequence of commits updates and the session
   * adopts once every commit of the sequence is written.
   */
  copy(): ItemIdentities {
    const copy = new ItemIdentities();
    copy.counter = this.counter;
    for (const [sequence, entry] of this.sequences) {
      copy.sequences.set(sequence, { items: [...entry.items], next: entry.next });
    }
    return copy;
  }

  private entry(sequence: string): Entry {
    let entry = this.sequences.get(sequence);
    if (entry === undefined) {
      entry = { items: [], next: this.mint() };
      this.sequences.set(sequence, entry);
    }
    return entry;
  }

  private mint(): string {
    this.counter += 1;
    return `#${this.counter}`;
  }
}
