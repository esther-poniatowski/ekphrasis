/**
 * Paths of files inside a vault: relative to the vault root, separated by `/`, without a leading
 * separator (e.g. `records/question.yml`).
 *
 * Both instances and schemas name other files by paths relative to their own folder (a modeline,
 * a `$ref`), so the resolution below is shared by the binding and the schema modules.
 */

/** Folder holding the file at `path`, or `""` for a file at the vault root. */
export function folderOf(path: string): string {
  const index = path.lastIndexOf("/");
  return index < 0 ? "" : path.slice(0, index);
}

/** Lowercase extension of the file at `path`, without the dot, or `""` when it has none. */
export function extensionOf(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const index = name.lastIndexOf(".");
  return index <= 0 ? "" : name.slice(index + 1).toLowerCase();
}

/**
 * Resolves `reference` against the folder `base`, and normalizes the segments `.` and `..`.
 *
 * A reference starting with `/` is resolved from the vault root. Returns `null` when the
 * reference climbs above the vault root, since no file of the vault lies there.
 */
export function resolveVaultPath(base: string, reference: string): string | null {
  const fromRoot = reference.startsWith("/");
  const segments = fromRoot ? [] : base.split("/").filter((segment) => segment !== "");
  for (const segment of reference.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (segments.length === 0) return null;
      segments.pop();
    } else {
      segments.push(segment);
    }
  }
  return segments.join("/");
}

/** Whether `reference` is an absolute URI, such as `https://example.org/a.schema.json`. */
export function isUri(reference: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(reference);
}
