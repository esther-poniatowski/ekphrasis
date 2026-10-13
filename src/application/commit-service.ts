/**
 * Use case that commits an edit of the form: plans the edits of the source text in the domain,
 * applies them through the document editor, and confirms them by parsing the new text, as the
 * decision on source-preserving writes requires.
 *
 * The confirmation compares the whole parsed document with the tree that the domain expects, so
 * a commit is written only when the edited value reads back as committed and every other value
 * reads back unchanged.
 */
import {
  buildFormModel,
  planCommit,
  sameContent,
  type ScalarCommit,
  type YamlNode,
} from "../domain";
import { EkphrasisError } from "../errors";
import type { FormReady } from "./form-service";
import type { DocumentEditor, DocumentParser } from "./protocols";

export type CommitResult =
  /** The new text, with the form state rebuilt from it. */
  | { readonly status: "written"; readonly text: string; readonly state: FormReady }
  /** The field already holds the committed value. */
  | { readonly status: "unchanged" }
  /** The commit was not written, for the reason given, to display at the field. */
  | { readonly status: "refused"; readonly reason: string };

/** Reason of a commit whose new text fails the confirmation. */
export const UNCONFIRMED =
  "The new text would not read back as the entered value, so the file was left unchanged.";

export class CommitService {
  constructor(
    private readonly parser: DocumentParser,
    private readonly editor: DocumentEditor,
  ) {}

  /** Commits `commit` on `text`, whose form state is `state`. */
  commit(state: FormReady, text: string, commit: ScalarCommit): CommitResult {
    const plan = planCommit(state.model, text, commit);
    if (plan.status !== "planned") return plan;
    let next: string;
    let tree: YamlNode;
    try {
      next = this.editor.apply(text, plan.edits);
      tree = this.parser.parse(next);
    } catch (error) {
      if (!(error instanceof EkphrasisError)) throw error;
      console.warn("ekphrasis: a commit was not confirmed.", error);
      return { status: "refused", reason: UNCONFIRMED };
    }
    if (!sameContent(tree, plan.expected)) return { status: "refused", reason: UNCONFIRMED };
    const model = buildFormModel(state.schemas, tree, next);
    return { status: "written", text: next, state: { ...state, model } };
  }
}
