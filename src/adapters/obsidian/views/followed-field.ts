/**
 * Field reached by a followed link: Obsidian opens the instance, then passes the subpath of the
 * link to its view as the ephemeral state `{subpath}`, as the spike of the milestone *Links*
 * observed. The form then moves to the field, as a click on an entry of the outline does.
 *
 * The subpath may arrive while the form of the new file is still being built, so the outcome
 * waits for the state of the current text. A link from a note has already opened the file when
 * its subpath arrives, so a malformed or unknown field path leaves the form at its top, with a
 * notice naming the defect.
 *
 * The module calls no API of Obsidian, so its outcomes are tested outside the host.
 */
import type { FormState } from "../../../application";
import {
  FieldLinkError,
  fieldOfFollowedSubpath,
  printFieldPath,
  type YamlPath,
} from "../../../domain";

/** Effect of a followed subpath on the view of its instance. */
export type FollowedOutcome =
  /** The form of the current text is being built; the outcome is computed again once it is. */
  | { readonly kind: "wait" }
  /** The subpath designates the root of the instance, so the form stays as it is. */
  | { readonly kind: "none" }
  | { readonly kind: "reveal"; readonly path: YamlPath }
  | { readonly kind: "notice"; readonly message: string };

/** Ephemeral state passed by Obsidian to a view: its subpath, or `null` when it holds none. */
export function subpathOfState(state: unknown): string | null {
  if (typeof state !== "object" || state === null) return null;
  const subpath = (state as Record<string, unknown>)["subpath"];
  return typeof subpath === "string" ? subpath : null;
}

/**
 * Outcome of the subpath `subpath` on the view whose current text has the state `state`, `null`
 * while the pipeline runs on it. `holds` tells whether the form holds a field at a path.
 */
export function followedOutcome(
  subpath: string,
  state: FormState | null,
  holds: (path: YamlPath) => boolean,
): FollowedOutcome {
  let path: YamlPath;
  try {
    path = fieldOfFollowedSubpath(subpath);
  } catch (error) {
    if (!(error instanceof FieldLinkError)) throw error;
    return { kind: "notice", message: `Ekphrasis: ${error.message} The form opens at its top.` };
  }
  if (path.length === 0) return { kind: "none" };
  if (state === null) return { kind: "wait" };
  const id = printFieldPath(path);
  if (state.status !== "form") {
    return {
      kind: "notice",
      message: `Ekphrasis: the instance has no form, so the link cannot reach the field \`${id}\`.`,
    };
  }
  if (!holds(path)) {
    return {
      kind: "notice",
      message: `Ekphrasis: the instance holds no field \`${id}\`, so the form opens at its top.`,
    };
  }
  return { kind: "reveal", path };
}
