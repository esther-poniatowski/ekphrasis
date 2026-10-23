/**
 * Index of the identifiers of records: maps each identifier to the files that declare it, as the
 * decision on record identifiers records.
 *
 * An identifier declared by several files is ambiguous, so a link by identifier to it opens no
 * file. The identifiers of one project may be unique within one record type only, so two types
 * declaring the same identifier also make it ambiguous.
 */

/** Outcome of the resolution of an identifier. */
export type IdentifierResolution =
  | { readonly status: "found"; readonly path: string }
  /** Several files declare the identifier; their vault paths, in lexicographic order. */
  | { readonly status: "ambiguous"; readonly paths: readonly string[] }
  | { readonly status: "absent" };

export class IdentifierIndex {
  /** Identifier declared by each indexed file. */
  private readonly identifiers = new Map<string, string>();
  /** Files declaring each identifier. */
  private readonly files = new Map<string, Set<string>>();

  /** Count of the files that declare an identifier. */
  get size(): number {
    return this.identifiers.size;
  }

  /**
   * Records that the file at `path` declares `identifier`, replacing its previous identifier;
   * `null` records that it declares none.
   */
  declare(path: string, identifier: string | null): void {
    this.remove(path);
    if (identifier === null) return;
    this.identifiers.set(path, identifier);
    const files = this.files.get(identifier) ?? new Set<string>();
    files.add(path);
    this.files.set(identifier, files);
  }

  /** Forgets the file at `path`, deleted or no longer a record. */
  remove(path: string): void {
    const identifier = this.identifiers.get(path);
    if (identifier === undefined) return;
    this.identifiers.delete(path);
    const files = this.files.get(identifier);
    files?.delete(path);
    if (files?.size === 0) this.files.delete(identifier);
  }

  /** Moves the identifier of the file at `oldPath` to `newPath`, after a rename. */
  rename(oldPath: string, newPath: string): void {
    const identifier = this.identifiers.get(oldPath) ?? null;
    this.remove(oldPath);
    this.declare(newPath, identifier);
  }

  /** Forgets every file. */
  clear(): void {
    this.identifiers.clear();
    this.files.clear();
  }

  /** Identifier declared by the file at `path`, or `null`. */
  identifierOf(path: string): string | null {
    return this.identifiers.get(path) ?? null;
  }

  resolve(identifier: string): IdentifierResolution {
    const paths = [...(this.files.get(identifier) ?? [])].sort();
    const [first] = paths;
    if (first === undefined) return { status: "absent" };
    return paths.length === 1 ? { status: "found", path: first } : { status: "ambiguous", paths };
  }
}
