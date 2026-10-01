/**
 * Content of the form view: the form of a bound instance, or the message explaining why the
 * pipeline stopped before the form, with a way to the source view.
 */
import type { ComponentChildren, JSX } from "preact";
import type { FormState } from "../../../application";
import type { FormModel, SchemaBinding } from "../../../domain";
import type { ControlRegistry } from "./control-registry";
import { FieldView } from "./field-view";
import { FormContext } from "./form-context";
import { FieldList } from "./sections/field-list";

export interface FormPanelProps {
  /** Outcome of opening the instance, or `null` while it is computed. */
  readonly state: FormState | null;
  readonly registry: ControlRegistry;
  readonly readOnly: boolean;
  readonly onOpenSource: () => void;
}

const BINDING_SOURCES: Readonly<Record<SchemaBinding["source"], string>> = {
  modeline: "the modeline",
  "path-rule": "a path rule",
};

export function FormPanel({
  state,
  registry,
  readOnly,
  onOpenSource,
}: FormPanelProps): JSX.Element {
  if (state === null) return <div class="ekphrasis-message">Loading the form…</div>;
  switch (state.status) {
    case "form":
      return (
        <FormContext.Provider value={{ registry, readOnly }}>
          <FormRoot model={state.model} binding={state.binding} />
        </FormContext.Provider>
      );
    case "unbound":
      return (
        <Message title="No schema" onOpenSource={onOpenSource}>
          This file is bound to no schema, so it has no form. To bind it, write the line{" "}
          <code># yaml-language-server: $schema=path/to/schema.yaml</code> at the top of the file,
          or add a path rule in the settings of ekphrasis.
        </Message>
      );
    case "invalid-binding":
      return (
        <Message title="Schema not found" onOpenSource={onOpenSource}>
          {`The ${state.source === "modeline" ? "modeline" : "path rule"} names the schema `}
          <code>{state.reference}</code>
          {`, but ${state.reason}.`}
        </Message>
      );
    case "parse-error": {
      const position = state.error.position;
      const where = position ? ` at line ${position.line}, column ${position.column}` : "";
      return (
        <Message title="Invalid YAML" onOpenSource={onOpenSource}>
          {`The text of the file fails to parse${where}: ${state.error.message}`}
        </Message>
      );
    }
    case "schema-error":
      return (
        <Message title="Schema not loaded" onOpenSource={onOpenSource}>
          {`The schema ${state.binding.schemaPath}, named by ${BINDING_SOURCES[state.binding.source]}, `}
          {`could not be loaded. ${state.error.message}`}
        </Message>
      );
  }
}

function FormRoot({
  model,
  binding,
}: {
  readonly model: FormModel;
  readonly binding: SchemaBinding;
}): JSX.Element {
  const { root } = model;
  return (
    <div class="ekphrasis-form">
      <div class="ekphrasis-form-header">
        {model.title !== null && <div class="ekphrasis-form-title">{model.title}</div>}
        <div class="ekphrasis-form-binding">
          {`Schema ${binding.schemaPath}, named by ${BINDING_SOURCES[binding.source]}.`}
        </div>
      </div>
      {model.schemaIssues.length > 0 && (
        <ul class="ekphrasis-schema-issues">
          {model.schemaIssues.map((issue, index) => (
            <li key={index}>
              {issue.path === "" ? issue.message : `${issue.path}: ${issue.message}`}
            </li>
          ))}
        </ul>
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
      <p>{children}</p>
      <button class="mod-cta" onClick={onOpenSource}>
        Open the source view
      </button>
    </div>
  );
}
