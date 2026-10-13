/**
 * Session of one open instance: its current text, the form state built from that text, and the
 * commits of the form.
 *
 * A commit applies only to a text whose form state is built, so its offsets refer to that text.
 * While the current text loads, or fails to parse, the session keeps the latest form for display
 * and queues each commit by field path; the queued commits apply, in their order, as soon as a
 * form is built from the current text. Therefore, a change made outside never meets a commit
 * computed on the text it replaced.
 */
import { printFieldPath, type ScalarCommit } from "../domain";
import type { CommitService } from "./commit-service";
import type { FormReady, FormService, FormState } from "./form-service";

/** Receiver of the effects of the session, implemented by the view of the instance. */
export interface SessionHost {
  /** Writes `text`, produced by one or several commits, to the file of the instance. */
  write(text: string): void;
  /** Displays the new snapshot of the session. */
  changed(): void;
}

/** What the form view displays. */
export interface SessionSnapshot {
  /** State of the current text, or `null` while the pipeline runs on it. */
  readonly state: FormState | null;
  /** Latest form built, displayed while the current text loads or fails to parse. */
  readonly form: FormReady | null;
  /** Reasons of the refused commits, by printed field path. */
  readonly errors: ReadonlyMap<string, string>;
}

/** Outcome of a commit, as the control that made it receives it. */
export type CommitOutcome = "written" | "unchanged" | "queued" | "refused";

export class InstanceSession {
  private current = "";
  private state: FormState | null = null;
  private form: FormReady | null = null;
  private readonly queue = new Map<string, ScalarCommit>();
  private readonly errors = new Map<string, string>();
  /** Counter of the texts set, so the pipeline run of a replaced text is discarded. */
  private generation = 0;

  constructor(
    private readonly forms: FormService,
    private readonly commits: CommitService,
    private readonly host: SessionHost,
  ) {}

  get text(): string {
    return this.current;
  }

  get snapshot(): SessionSnapshot {
    return { state: this.state, form: this.form, errors: new Map(this.errors) };
  }

  /** Forgets the form, the queue and the errors, before the text of another file loads. */
  reset(): void {
    this.current = "";
    this.state = null;
    this.form = null;
    this.queue.clear();
    this.errors.clear();
    this.generation += 1;
  }

  /**
   * Replaces the text by a text read from the file or typed in the source view. The form state
   * of the new text is computed by {@link refresh}; until then, commits are queued.
   */
  setText(text: string): void {
    if (text === this.current) return;
    this.current = text;
    this.state = null;
    this.errors.clear();
    this.generation += 1;
  }

  /**
   * Runs the form pipeline on the current text of the file at the vault path `path`, then
   * applies the queued commits. A run superseded by a later text is discarded; a run whose text
   * a commit changed meanwhile runs again on the new text.
   */
  async refresh(path: string): Promise<void> {
    const generation = ++this.generation;
    let text: string;
    let state: FormState;
    do {
      text = this.current;
      state = await this.forms.open(path, text);
      if (generation !== this.generation) return;
    } while (text !== this.current);
    this.state = state;
    if (state.status === "form") {
      this.form = state;
      this.flush();
    }
    this.host.changed();
  }

  /** Commits `commit` now when the current text has a form, and else queues it. */
  commit(commit: ScalarCommit): CommitOutcome {
    const id = printFieldPath(commit.path);
    let outcome: CommitOutcome;
    if (this.state?.status === "form") {
      outcome = this.apply(this.state, id, commit);
      if (outcome === "written") this.host.write(this.current);
    } else {
      this.queue.set(id, commit);
      this.errors.delete(id);
      outcome = "queued";
    }
    this.host.changed();
    return outcome;
  }

  private apply(state: FormReady, id: string, commit: ScalarCommit): CommitOutcome {
    const result = this.commits.commit(state, this.current, commit);
    if (result.status === "refused") {
      this.errors.set(id, result.reason);
      return "refused";
    }
    this.errors.delete(id);
    if (result.status === "unchanged") return "unchanged";
    this.current = result.text;
    this.state = result.state;
    this.form = result.state;
    return "written";
  }

  /** Applies the queued commits to the current form, and writes their text once. */
  private flush(): void {
    let written = false;
    for (const [id, commit] of [...this.queue]) {
      this.queue.delete(id);
      const state = this.state;
      if (state?.status === "form" && this.apply(state, id, commit) === "written") written = true;
    }
    if (written) this.host.write(this.current);
  }
}
