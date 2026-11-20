/**
 * Index of the records bound to a logical contract, by vault path, from which the entries named
 * by a reference are read: each record keeps its contract and its value, so a reference to any
 * collection of that contract is answered without reading the files again.
 */
import type { JsonValue } from "../schema/json";
import { entryIdentifiers, type EntryReference, type ReferenceEntries } from "./entry-reference";

interface IndexedRecord {
  readonly contract: string;
  readonly value: JsonValue;
}

export class EntryIndex {
  private readonly records = new Map<string, IndexedRecord>();

  /**
   * Records that the file at `path` holds `value` under the logical contract `contract`,
   * replacing its previous record; `null` records that it holds no record bound to a contract.
   */
  declare(path: string, record: { contract: string; value: JsonValue } | null): void {
    if (record === null) this.records.delete(path);
    else this.records.set(path, record);
  }

  /** Forgets the file at `path`. */
  remove(path: string): void {
    this.records.delete(path);
  }

  /** Forgets every file. */
  clear(): void {
    this.records.clear();
  }

  /** Logical contract of the record at `path`, or `null`. */
  contractOf(path: string): string | null {
    return this.records.get(path)?.contract ?? null;
  }

  /**
   * Entries of the records bound to the contract of `reference`, read in the order of their
   * vault paths, each identifier once.
   */
  entries(reference: EntryReference): ReferenceEntries {
    const paths = [...this.records.keys()].sort();
    const identifiers = new Set<string>();
    let records = 0;
    for (const path of paths) {
      const record = this.records.get(path);
      if (record === undefined || record.contract !== reference.schema) continue;
      records += 1;
      for (const identifier of entryIdentifiers(record.value, reference)) {
        identifiers.add(identifier);
      }
    }
    return { records, identifiers: [...identifiers] };
  }
}
