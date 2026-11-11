/**
 * Permission of the operating system to write a file, asked without writing: the save of a form
 * writes the file in place, so the permission of that file decides whether the save succeeds.
 */
import type { WriteAccess } from "../../application";

/** Error codes by which the operating system refuses a write. */
const REFUSALS = new Set(["EACCES", "EPERM", "EROFS", "ENOENT", "EISDIR"]);

/** Write permission of the file at the absolute path `path`. */
export async function writeAccessOf(path: string): Promise<WriteAccess> {
  const { access, constants } = await import("node:fs/promises");
  try {
    await access(path, constants.W_OK);
    return { status: "writable" };
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    const reason = typeof code === "string" ? code : String(error);
    return REFUSALS.has(reason) ? { status: "denied", reason } : { status: "unknown", reason };
  }
}
