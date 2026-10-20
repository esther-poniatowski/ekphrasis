/**
 * Content of the form view: the form of a bound instance, or the message explaining why the
 * pipeline stopped before the form, with a way to the source view.
 *
 * While the text of the file loads again, or fails to parse, the latest form stays displayed and
 * editable, so the text typed in a control survives a change made outside. A text that fails to
 * parse adds a notice above the form: the commits made meanwhile wait for a text that parses.
 *
 * The issues of validation display at their fields. The top of the form counts them by mark,
 * names the fields holding them, and lists those whose path designates no field of the form.
 */
import type { ComponentChildren, JSX } from "preact";
import type { FormReady, SessionSnapshot } from "../../../application";
import {
  ConstraintIndex,
  IssueIndex,
  type Commit,
  type SchemaBinding,
  type SchemaIssue,
  type YamlPath,
} from "../../../domain";
import type { YamlParseError } from "../../../errors";
import type { ControlRegistry } from "./control-registry";
import { FieldHelp, HelpButton, hasGuidance } from "./field-help";
import { FieldView } from "./field-view";
import type { FoldState } from "./fold-state";
import { FormContext, type LossRequest } from "./form-context";
import type { HelpState } from "./help-state";
import { InlineText } from "./inline-text";
import { IssueSummary } from "./issue-summary";
import type { RenderScheduler } from "./rendering/render-queue";
import type { ValueRenderer } from "./rendering/value-renderer";
import { FieldList } from "./sections/field-list";

export interface FormPanelProps {
  readonly snapshot: SessionSnapshot;
  readonly registry: ControlRegistry;
  /** Commits a value or a structural edit made in the form. */
  readonly commit: (commit: Commit) => void;
  /** Commits several structural edits as one change, and returns whether the text holds them. */
  readonly commitAll: (commits: readonly Commit[]) => boolean;
  /** Asks the author to confirm a switch of alternative that would remove filled values. */
  readonly confirmLoss: (request: LossRequest) => Promise<boolean>;
  readonly commitDelay: number;
  /** Folded state of the sections, kept by the view across displays. */
  readonly folds: FoldState;
  /** Shown instructions of the fields, kept by the view across displays. */
  readonly help: HelpState;
  readonly renderer: ValueRenderer;
  readonly scheduler: RenderScheduler;
  /** Moves the form to the field at a path, unfolding the sections containing it. */
  readonly reveal: (path: YamlPath) => void;
  readonly onOpenSource: () => void;
}

const BINDING_SOURCES: Readonly<Record<SchemaBinding["source"], string>> = {
  modeline: "the modeline",
  "path-rule": "a path rule",
};

export function FormPanel(props: FormPanelProps): JSX.Element {
  const { snapshot, onOpenSource } = props;
  const { state, form } = snapshot;
  if (form !== null && (state === null || state.status === "parse-error")) {
    const notice =
      state === null ? null : <SuspendedNotice error={state.error} onOpenSource={onOpenSource} />;
    return <EditableForm {...props} form={form} notice={notice} />;
  }
  if (state === null) return <div class="ekphrasis-message">Loading the form…</div>;
  switch (state.status) {
    case "form":
      return <EditableForm {...props} form={state} notice={null} />;
    case "unbound":
      return (
        <Message title="This file is bound to no schema" onOpenSource={onOpenSource}>
          <p>To display it as a form, bind it to a schema by one of two methods:</p>
          <ul class="ekphrasis-message-list">
            <li>
              write at the top of the file the line{" "}
              <code># yaml-language-server: $schema=path/to/schema.yaml</code>;
            </li>
            <li>add a path rule in the settings of ekphrasis.</li>
          </ul>
        </Message>
      );
    case "invalid-binding":
      return (
        <Message title="Schema not found" onOpenSource={onOpenSource}>
          <p>
            {`The ${state.source === "modeline" ? "modeline" : "path rule"} names the schema `}
            <code>{state.reference}</code>
            {`, but ${state.reason}.`}
          </p>
        </Message>
      );
    case "parse-error":
      return (
        <Message title="Invalid YAML" onOpenSource={onOpenSource}>
          <ParseErrorDetail error={state.error} />
        </Message>
      );
    case "schema-error":
      return (
        <Message title="Schema not loaded" onOpenSource={onOpenSource}>
          <p>
            The schema <code>{state.binding.schemaPath}</code>
            {`, named by ${BINDING_SOURCES[state.binding.source]}, could not be loaded:`}
          </p>
          <p class="ekphrasis-message-detail">
            <InlineText text={state.error.message} />
          </p>
        </Message>
      );
  }
}

function EditableForm({
  form,
  notice,
  snapshot,
  registry,
  commit,
  commitAll,
  confirmLoss,
  commitDelay,
  folds,
  help,
  renderer,
  scheduler,
  reveal,
}: FormPanelProps & {
  readonly form: FormReady;
  readonly notice: JSX.Element | null;
}): JSX.Element {
  const issues = IssueIndex.of(form.model, form.report.issues);
  const constraints = new ConstraintIndex(form.report.constraints);
  return (
    <FormContext.Provider
      value={{
        registry,
        commit: (path, value) => commit({ path, value }),
        edit: commit,
        editAll: commitAll,
        confirmLoss,
        commitDelay,
        errors: snapshot.errors,
        issues,
        constraints,
        folds,
        help,
        renderer,
        scheduler,
        reveal,
      }}
    >
      <FormRoot form={form} issues={issues} notice={notice} />
    </FormContext.Provider>
  );
}

function FormRoot({
  form,
  issues,
  notice,
}: {
  readonly form: FormReady;
  readonly issues: IssueIndex;
  readonly notice: JSX.Element | null;
}): JSX.Element {
  const { model, binding } = form;
  const { root } = model;
  const schemaIssues: readonly SchemaIssue[] = [...model.schemaIssues, ...form.report.schemaIssues];
  return (
    <div class="ekphrasis-form">
      <div class="ekphrasis-form-header">
        {(model.title !== null || hasGuidance(root)) && (
          <div class="ekphrasis-form-title">
            {model.title}
            {hasGuidance(root) && (
              <HelpButton helpKey={root.uid} label={model.title ?? "the record"} />
            )}
          </div>
        )}
        <FieldHelp helpKey={root.uid} guidance={root} />
        <div class="ekphrasis-form-binding">
          Schema <code>{binding.schemaPath}</code>
          {`, named by ${BINDING_SOURCES[binding.source]}.`}
        </div>
      </div>
      {notice}
      {schemaIssues.length > 0 && (
        <div class="ekphrasis-schema-issues" role="alert">
          <div class="ekphrasis-schema-issues-title">Schema warnings</div>
          <ul class="ekphrasis-path-messages">
            {schemaIssues.map((issue, index) => (
              <li key={index}>
                <code class="ekphrasis-issue-path">
                  {issue.path === "" ? "(root)" : issue.path}
                </code>
                <span class="ekphrasis-issue-message">
                  <InlineText text={issue.message} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <IssueSummary model={model} issues={issues} />
      {root.mismatch === null &&
      (root.kind === "group" || root.kind === "keyed-table" || root.kind === "keyed-records") ? (
        <FieldList field={root} />
      ) : (
        <FieldView field={root} />
      )}
    </div>
  );
}

function Message({
  title,
  children,
  onOpenSource,
}: {
  readonly title: string;
  readonly children: ComponentChildren;
  readonly onOpenSource: () => void;
}): JSX.Element {
  return (
    <div class="ekphrasis-message">
      <div class="ekphrasis-message-title">{title}</div>
      {children}
      <div class="ekphrasis-message-actions">
        <button class="mod-cta" onClick={onOpenSource}>
          Open the source view
        </button>
      </div>
    </div>
  );
}

/** Notice above a form whose file text fails to parse: commits wait for a text that parses. */
function SuspendedNotice({
  error,
  onOpenSource,
}: {
  readonly error: YamlParseError;
  readonly onOpenSource: () => void;
}): JSX.Element {
  return (
    <div class="ekphrasis-suspended" role="alert">
      <ParseErrorDetail error={error} />
      <p>
        The form shows the last text that parsed. Its edits are kept, and are saved once the text
        parses again.
      </p>
      <div class="ekphrasis-message-actions">
        <button onClick={onOpenSource}>Open the source view</button>
      </div>
    </div>
  );
}

/** Position, message and excerpt of a parse error. */
function ParseErrorDetail({ error }: { readonly error: YamlParseError }): JSX.Element {
  const position = error.position;
  return (
    <>
      <p>
        {position
          ? `The text of the file fails to parse at line ${position.line}, column ${position.column}:`
          : "The text of the file fails to parse:"}
      </p>
      <p class="ekphrasis-message-detail">
        <InlineText text={error.message} />
      </p>
      {position && (
        <pre class="ekphrasis-source-excerpt">
          {`${position.line} | ${position.lineText}\n`}
          {`${" ".repeat(String(position.line).length + 3 + position.column - 1)}^`}
        </pre>
      )}
    </>
  );
}
