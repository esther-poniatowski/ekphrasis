export class TFile {}

export class TFolder {}

/** Adapter of the desktop app, whose vault lies at `basePath` on the file system. */
export class FileSystemAdapter {
  constructor(private readonly basePath: string) {}

  getFullPath(path: string): string {
    return `${this.basePath}/${path}`;
  }
}

export function normalizePath(path: string): string {
  return path
    .split("/")
    .filter((segment) => segment !== "" && segment !== ".")
    .join("/");
}
