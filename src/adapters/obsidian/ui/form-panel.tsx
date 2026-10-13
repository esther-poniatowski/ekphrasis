/**
 * Content of the form view: the form of a bound instance, or the message explaining why the
 * pipeline stopped before the form, with a way to the source view.
 *
 * While the text of the file loads again, or fails to parse, the latest form stays displayed and
 * editable, so the text typed in a control survives a change made outside. A text that fails to
 * parse adds a notice above the form: the commits made meanwhile wait for a text that parses.
 *
 * The issues of validation display at their fields. The top of the form counts them, and lists
 * those whose path designates no field of the form.
 */
import type { ComponentChildren, JSX } from "preact";
import type { FormReady, SessionSnapshot } from "../../../application";
import { IssueIndex, type SchemaBinding, type SchemaIssue } from "../../../domain";
import type { YamlParseError } from "../../../errors";
import type { ControlRegistry } from "./control-registry";
import { FieldView } from "./field-view";
import { FormContext, type FormContextValue } from "./form-context";
import { InlineText } from "./inline-text";
import { countPhrase, IssueList } from "./issue-list";
import { FieldList } from "./sections/field-list";

export interface FormPanelProps {
  readonly snapshot: SessionSnapshot;
  readonly registry: ControlRegistry;
  readonly commit: FormContextValue["commit"];
  readonly commitDelay: number;
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
        <Message title="No schema" onOpenSource={onOpenSource}>
          <p>
            This file is bound to no schema, so it has no form. To bind it, write the line{" "}
            <code># yaml-language-server: $schema=path/to/schema.yaml</code> at the top of the file,
            or add a path rule in the settings of ekphrasis.
          </p>
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
  commitDelay,
}: FormPanelProps & {
  readonly form: FormReady;
  readonly notice: JSX.Element | null;
}): JSX.Element {
  const issues = IssueIndex.of(form.model, form.report.issues);
  return (
    <FormContext.Provider
      value={{ registry, commit, commitDelay, errors: snapshot.errors, issues }}
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
        {model.title !== null && <div class="ekphrasis-form-title">{model.title}</div>}
        <div class="ekphrasis-form-binding">
          Schema <code>{binding.schemaPath}</code>
          {`, named by ${BINDING_SOURCES[binding.source]}.`}
        </div>
      </div>
      {notice}
      {schemaIssues.length > 0 && (
        <div class="ekphrasis-schema-issues" role="alert">
          <div class="ekphrasis-schema-issues-title">Schema warnings</div>
          <ul>
            {schemaIssues.map((issue, index) => (
              <li key={index}>
                <code class="ekphrasis-issue-path">
                  {issue.path === "" ? "(root)" : issue.path}
                </code>
                <InlineText text={issue.message} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {issues.issues.length > 0 && (
        <div class="ekphrasis-issue-summary">
          <div class="ekphrasis-issue-summary-title">
            {`Validation: ${countPhrase(issues.counts)}.`}
          </div>
          <IssueList issues={issues.unplaced} withPaths />
        </div>
      )}
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
